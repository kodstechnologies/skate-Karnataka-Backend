import { asyncHandler } from "../../util/common/asyncHandler.js";
import { generateChestNumbersForEvent } from "./skaterChestNo.service.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta } from "../../util/common/paginate.js";
import {
    normalizeCompetitionTimeForStorage,
    parseCompetitionTimeTakenToSeconds,
} from "../../util/time/timeUtil.js";
import { getEventSkatingEventCategoriesFullRepository } from "../event/event.repositories.js";
import {
    getFormulaQualificationTypeForRound,
    getPromotionLimit,
    getQualificationTypeFromFormula,
    resolvePromotionContext,
} from "./competition.formulaResolve.js";
import {
    selectFinalWinners,
    selectPromotedCompetitors,
} from "./competition.promotion.js";
import {
    buildCategoriesForAgeGroup,
    collectAgeGroupLabels,
    findEventCategoryByQuery,
    findEventCategoryMeta,
    formatCategoryRoundDisplay,
    scopeResolvedSkatingCategories,
    toCategoryMetaFields,
    toDisplayRoundCategoryOnly,
} from "./displayRound.util.js";

const applyCompetitorPointsUpdate = (competitor, { time, position }, qualificationType) => {
    competitor.time = normalizeCompetitionTimeForStorage(time);
    if (qualificationType === "POSITION") {
        competitor.position = position;
    }
};

const displayAllCompetition = asyncHandler(async (req, res) => { });
const displayCompetitionById = asyncHandler(async (req, res) => { });

/**
 * Get generated chest numbers for an event, optionally filtered by age group.
 */
const getChestNumbersByEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { ageGroup } = req.query;

    const query = { eventId };
    if (ageGroup) {
        query.ageGroup = ageGroup;
    }

    const chestNumbers = await SkaterChestNo.find(query).sort({ ageGroup: 1, chestNo: 1 });

    res.status(200).json({
        success: true,
        data: chestNumbers,
    });
});

/**
 * Manually trigger chest number generation for a specific event.
 */
const generateChestNumbers = asyncHandler(async (req, res) => {
    const { eventId } = req.body;
    if (!eventId) {
        throw new AppError("eventId is required", 400);
    }

    const result = await generateChestNumbersForEvent(eventId);

    res.status(200).json({
        success: true,
        message: `Successfully generated ${result.count} skater chest numbers.`,
        data: result,
    });
});

/**
 * Get full competition details for an event, displaying 'pending' for any empty rounds.
 */
const getCompetitionDetailsByEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const {
        ageGroup,
        name,
        round,
        page,
        limit,
        categoryId,
        categoriesId,
        skatingEventCategoryId,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skipNum = (pageNum - 1) * limitNum;

    const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
    if (!eventMeta) {
        throw new AppError("Event not found", 404);
    }

    const resolvedCategories = eventMeta.skatingEventCategories || [];

    let categoryFilterName = name ? String(name).trim() : null;
    let resolvedCategoryMeta = null;

    const hasCategoryIdLookup = Boolean(
        categoryId || categoriesId || skatingEventCategoryId
    );

    if (hasCategoryIdLookup || categoryFilterName) {
        resolvedCategoryMeta = findEventCategoryByQuery(resolvedCategories, {
            ageGroup,
            categoryId,
            categoriesId,
            skatingEventCategoryId,
            name: categoryFilterName,
        });

        if (!resolvedCategoryMeta && categoryFilterName && ageGroup) {
            resolvedCategoryMeta = findEventCategoryMeta(
                resolvedCategories,
                ageGroup,
                categoryFilterName
            );
        }

        if (!resolvedCategoryMeta && hasCategoryIdLookup) {
            throw new AppError("Category not found for this event", 404);
        }

        if (resolvedCategoryMeta) {
            categoryFilterName = resolvedCategoryMeta.name;
        }
    }

    const query = { eventId };
    if (ageGroup) {
        query.ageGroup = ageGroup;
    }

    const competitions = await EventCompetition.find(query).lean();

    let totalSkatersCount = 0;

    const formattedCompetitions = competitions.map((comp) => {
        let filteredCategories = comp.categories || [];

        if (categoryFilterName) {
            filteredCategories = filteredCategories.filter(
                (cat) =>
                    cat.name &&
                    cat.name.trim().toLowerCase() === categoryFilterName.trim().toLowerCase()
            );
        }

        const formattedCategories = filteredCategories.map((cat) => {
            const meta =
                resolvedCategoryMeta &&
                cat.name &&
                cat.name.trim().toLowerCase() === categoryFilterName.trim().toLowerCase()
                    ? resolvedCategoryMeta
                    : findEventCategoryMeta(resolvedCategories, comp.ageGroup, cat.name);

            const metaFields = toCategoryMetaFields(meta);

            if (round) {
                const roundData = cat[round] && cat[round].length > 0 ? cat[round] : [];
                totalSkatersCount += roundData.length;
                const paginatedData = roundData.slice(skipNum, skipNum + limitNum);
                const qualificationType = getQualificationTypeFromFormula(
                    meta?.formula,
                    round
                );
                return {
                    name: cat.name,
                    ...metaFields,
                    round,
                    qualificationType,
                    participants: paginatedData,
                };
            }

            return {
                name: cat.name,
                ...metaFields,
                "1stRound":
                    cat["1stRound"] && cat["1stRound"].length > 0 ? cat["1stRound"] : "pending",
                "2ndRound":
                    cat["2ndRound"] && cat["2ndRound"].length > 0 ? cat["2ndRound"] : "pending",
                "semiFinal":
                    cat["semiFinal"] && cat["semiFinal"].length > 0 ? cat["semiFinal"] : "pending",
                "final": cat["final"] && cat["final"].length > 0 ? cat["final"] : "pending",
                "1st": cat["1st"] && cat["1st"].length > 0 ? cat["1st"] : "pending",
                "2nd": cat["2nd"] && cat["2nd"].length > 0 ? cat["2nd"] : "pending",
                "3rd": cat["3rd"] && cat["3rd"].length > 0 ? cat["3rd"] : "pending",
            };
        });

        return {
            eventId: comp.eventId,
            ageGroup: comp.ageGroup,
            categories: formattedCategories,
        };
    });

    const responseJson = {
        success: true,
        data: formattedCompetitions,
    };

    if (resolvedCategoryMeta) {
        responseJson.category = toCategoryMetaFields(resolvedCategoryMeta);
        responseJson.category.name = resolvedCategoryMeta.name;
        if (round) {
            responseJson.category.qualificationType = getQualificationTypeFromFormula(
                resolvedCategoryMeta.formula,
                round
            );
            responseJson.qualificationType = responseJson.category.qualificationType;
        }
    }

    if (round) {
        responseJson.pagination = buildPaginationMeta({
            total: totalSkatersCount,
            page: pageNum,
            limit: limitNum,
        });
    }

    res.status(200).json(responseJson);
});

/**
 * Display competition round progress for an event (round status only).
 *
 * Query:
 *   - skatingEventCategories + ageGroup + name → one lap, rounds only
 *   - ageGroup + name → one lap, rounds only
 *   - ageGroup → all laps for age group (rounds only per lap)
 *   - (none) → all age groups
 */
const displayRound = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const ageGroup = req.query.ageGroup ? String(req.query.ageGroup).trim() : "";
    const name = req.query.name ? String(req.query.name).trim() : "";
    const skatingEventCategoryId =
        req.query.skatingEventCategories ||
        req.query.skatingEventCategoryId ||
        req.query.categoriesId ||
        "";
    const categoryId = req.query.categoryId ? String(req.query.categoryId).trim() : "";

    const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
    if (!eventMeta) {
        throw new AppError("Event not found", 404);
    }

    const resolvedCategories = eventMeta.skatingEventCategories || [];
    const scopedCategories = scopeResolvedSkatingCategories(
        resolvedCategories,
        skatingEventCategoryId
    );

    if (skatingEventCategoryId && !scopedCategories.length) {
        throw new AppError("Skating event category not linked to this event", 404);
    }

    const competitions = await EventCompetition.find({ eventId }).lean();
    const competitionByAge = new Map(
        competitions.map((row) => [String(row.ageGroup || "").trim(), row])
    );

    const mapToRoundsOnly = (categoryDoc, formula, meta = {}) =>
        toDisplayRoundCategoryOnly(
            formatCategoryRoundDisplay(categoryDoc, formula, meta)
        );

    if (ageGroup && name) {
        const competition = competitionByAge.get(ageGroup) || null;
        const competitionCategory = competition
            ? (competition.categories || []).find(
                  (row) =>
                      row.name &&
                      row.name.trim().toLowerCase() === name.trim().toLowerCase()
              )
            : null;

        let meta = findEventCategoryByQuery(scopedCategories, {
            ageGroup,
            categoryId,
            categoriesId: skatingEventCategoryId,
            skatingEventCategoryId,
            name,
        });

        if (!meta) {
            meta = findEventCategoryMeta(scopedCategories, ageGroup, name);
        }

        if (!competitionCategory && !meta) {
            throw new AppError("Category not found for this event and age group", 404);
        }

        const categoryName = meta?.name || name;
        const metaFields = meta
            ? {
                  skatingEventCategoryId: String(meta.skatingEventCategoryId),
                  skatingEventCategoryName: meta.skatingEventCategoryName,
                  categoryId: String(meta.categoryId),
              }
            : skatingEventCategoryId
              ? { skatingEventCategoryId: String(skatingEventCategoryId) }
              : {};

        const category = mapToRoundsOnly(
            competitionCategory || { name: categoryName },
            meta?.formula,
            metaFields
        );
        category.name = categoryName;

        return res.status(200).json({
            success: true,
            data: {
                eventId,
                ageGroup,
                category,
            },
        });
    }

    if (ageGroup) {
        const competition = competitionByAge.get(ageGroup) || null;
        const categories = buildCategoriesForAgeGroup({
            ageGroup,
            resolvedCategories: scopedCategories,
            competition,
        }).map((row) => toDisplayRoundCategoryOnly(row));

        if (!categories.length) {
            throw new AppError("No categories configured for this age group", 404);
        }

        return res.status(200).json({
            success: true,
            data: {
                eventId,
                ageGroup,
                categories,
            },
        });
    }

    const ageGroupLabels = collectAgeGroupLabels(scopedCategories, competitions);
    const ageGroups = ageGroupLabels.map((label) => ({
        ageGroup: label,
        categories: buildCategoriesForAgeGroup({
            ageGroup: label,
            resolvedCategories: scopedCategories,
            competition: competitionByAge.get(label) || null,
        }).map((row) => toDisplayRoundCategoryOnly(row)),
    }));

    return res.status(200).json({
        success: true,
        data: {
            eventId,
            ageGroups,
        },
    });
});

/**
 * Update time and position for competitors in a specific round.
 *
 * Body:
 * {
 *   "eventId": "<ObjectId>",
 *   "ageGroup": "Under 14",
 *   "round": "1stRound",          // 1stRound | 2ndRound | semiFinal | final
 *   "categories": [
 *     {
 *       "name": "500m",
 *       "competitors": [
 *         { "skaterId": "<ObjectId>", "time": "01:23.45", "position": "1" }
 *       ]
 *     }
 *   ]
 * }
 */
const updatePoints = asyncHandler(async (req, res) => {
    const { eventId, ageGroup, round, categories, skaterId, time, position } = req.body;
    const skatingEventCategoryId =
        req.body.skatingEventCategoryId ||
        req.body.skatingEventCategories ||
        req.body.categoriesId ||
        null;

    const competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    const qualificationTypeCache = new Map();
    const resolveQualificationType = async (categoryName) => {
        const key = String(categoryName || "").trim().toLowerCase();
        if (!qualificationTypeCache.has(key)) {
            const type = await getFormulaQualificationTypeForRound(eventId, {
                ageGroup,
                categoryName,
                round,
                skatingEventCategoryId,
            });
            qualificationTypeCache.set(key, type);
        }
        return qualificationTypeCache.get(key);
    };

    const validateCompetitorPayload = (comp, qualificationType, categoryName) => {
        if (comp.time === undefined || comp.time === null || !String(comp.time).trim()) {
            throw new AppError(
                `time is required for category "${categoryName}"`,
                400
            );
        }
        if (qualificationType === "POSITION") {
            if (comp.position === undefined || comp.position === null) {
                throw new AppError(
                    `position is required for POSITION qualification in category "${categoryName}" (round ${round})`,
                    400
                );
            }
        }
    };

    const responseCategories = [];

    if (skaterId) {
        let foundCategory = null;
        let foundCompetitor = null;

        for (const category of competition.categories) {
            const roundData = category[round] || [];
            const competitor = roundData.find(
                (row) => String(row.skaterId) === String(skaterId)
            );
            if (competitor) {
                foundCategory = category;
                foundCompetitor = competitor;
                break;
            }
        }

        if (!foundCategory || !foundCompetitor) {
            throw new AppError("Skater not found in any category for the given round", 404);
        }

        const qualificationType = await resolveQualificationType(foundCategory.name);
        validateCompetitorPayload(
            { time, position },
            qualificationType,
            foundCategory.name
        );
        applyCompetitorPointsUpdate(
            foundCompetitor,
            { time, position },
            qualificationType
        );

        responseCategories.push({
            name: foundCategory.name,
            qualificationType,
            competitors: foundCategory[round],
        });
    } else {
        for (const catUpdate of categories) {
            const { name, competitors } = catUpdate;
            if (!name || !Array.isArray(competitors)) {
                continue;
            }

            const category = competition.categories.find(
                (row) =>
                    row.name &&
                    row.name.trim().toLowerCase() === name.trim().toLowerCase()
            );

            if (!category) {
                throw new AppError(
                    `Category "${name}" not found for age group ${ageGroup}`,
                    404
                );
            }

            const qualificationType = await resolveQualificationType(category.name);
            const roundData = category[round] || [];

            for (const comp of competitors) {
                validateCompetitorPayload(comp, qualificationType, category.name);

                const competitor = roundData.find(
                    (row) => String(row.skaterId) === String(comp.skaterId)
                );

                if (!competitor) {
                    throw new AppError(
                        `Skater ${comp.skaterId} not found in "${category.name}" for ${round}`,
                        404
                    );
                }

                applyCompetitorPointsUpdate(competitor, comp, qualificationType);
            }

            responseCategories.push({
                name: category.name,
                qualificationType,
                competitors: category[round],
            });
        }
    }

    await competition.save();

    res.status(200).json({
        success: true,
        message: "Points updated successfully",
        data: {
            eventId: competition.eventId,
            ageGroup: competition.ageGroup,
            round: round,
            categories: responseCategories
        },
    });
});

// Helpers for round progression
const getSecondsFromTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return Infinity;
    const trimmed = timeStr.trim();
    if (!trimmed) return Infinity;
    try {
        return parseCompetitionTimeTakenToSeconds(trimmed);
    } catch (err) {
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? Infinity : parsed;
    }
};

const mapCompetitor = (c) => ({
    skaterId: c.skaterId,
    chestNo: c.chestNo || "",
    fullName: c.fullName || "",
    krsaId: c.krsaId || "",
    rsfiId: c.rsfiId || "",
    time: c.time || "",
    position: c.position || "0",
});

const mapCompetitorWithReset = (c) => ({
    skaterId: c.skaterId,
    chestNo: c.chestNo || "",
    fullName: c.fullName || "",
    krsaId: c.krsaId || "",
    rsfiId: c.rsfiId || "",
    time: "",
    position: "0",
});

/**
 * Promote qualified skaters from the current round to the next (formula qualifyCount).
 *
 * Body: { eventId, ageGroup, round, name, skatingEventCategoryId? }
 */
const promoteToNextRound = asyncHandler(async (req, res) => {
    const { eventId, ageGroup, round, name } = req.body;
    const skatingEventCategoryId =
        req.body.skatingEventCategoryId ||
        req.body.skatingEventCategories ||
        req.body.categoriesId ||
        req.body.categoryId ||
        null;

    const competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    const category = competition.categories.find(
        (row) =>
            row.name &&
            row.name.trim().toLowerCase() === String(name || "").trim().toLowerCase()
    );

    if (!category) {
        throw new AppError(`Category "${name}" not found for age group ${ageGroup}`, 404);
    }

    const currentRoundData = category[round] || [];
    if (!currentRoundData.length) {
        throw new AppError(`No skaters in ${round} for "${name}"`, 400);
    }

    const promotionCtx = await resolvePromotionContext(eventId, {
        ageGroup,
        categoryName: name,
        round,
        skatingEventCategoryId,
    });

    if (!promotionCtx) {
        throw new AppError("Category not found for this event", 404);
    }

    const targetRound = promotionCtx.nextRound;
    if (!targetRound) {
        throw new AppError(`Cannot promote from round "${round}"`, 400);
    }

    const currentRoundCount = currentRoundData.length;

    if (!promotionCtx.formula?.rounds?.length) {
        throw new AppError(
            "No formula linked to this category (set formula on lap \"100\" in event category config).",
            400
        );
    }

    if (!promotionCtx.formulaRound) {
        throw new AppError(
            `Formula "${promotionCtx.formula.formulaName || promotionCtx.formulaId}" has no "${round}" round.`,
            400
        );
    }

    const { limit: promoteLimit, limitSource } = getPromotionLimit(
        promotionCtx.formulaRound,
        { currentRoundCount }
    );

    if (promoteLimit == null || promoteLimit <= 0) {
        throw new AppError(
            `Formula round "${round}" has no valid qualify count. Set qualifyCount (or qualifyCountLessThan65 / qualifyCountMoreThan65).`,
            400
        );
    }

    let totalPromoted = 0;

    if (targetRound === "winners") {
        const { firstPlace, secondPlace, thirdPlace } = selectFinalWinners(
            currentRoundData,
            promotionCtx.finalSelectionCount,
            getSecondsFromTime
        );

        category["1st"] = firstPlace ? [mapCompetitor(firstPlace)] : [];
        category["2nd"] = secondPlace ? [mapCompetitor(secondPlace)] : [];
        category["3rd"] = thirdPlace ? [mapCompetitor(thirdPlace)] : [];
        totalPromoted =
            (firstPlace ? 1 : 0) + (secondPlace ? 1 : 0) + (thirdPlace ? 1 : 0);
    } else {
        const promoted = selectPromotedCompetitors(
            currentRoundData,
            promoteLimit,
            promotionCtx.qualificationType,
            getSecondsFromTime,
            promotionCtx.formulaRound
        );

        if (!promoted.length) {
            throw new AppError(
                promotionCtx.qualificationType === "POSITION"
                    ? `No skaters qualify (POSITION: need position qualifiers or fastest times up to ${promoteLimit})`
                    : `No skaters with valid times to promote (limit ${promoteLimit})`,
                400
            );
        }

        category[targetRound] = promoted.map(mapCompetitorWithReset);
        totalPromoted = promoted.length;
    }

    if (totalPromoted === 0) {
        throw new AppError(`No skaters qualified to progress from "${round}"`, 400);
    }

    await competition.save();

    res.status(200).json({
        success: true,
        message:
            targetRound === "winners"
                ? "Successfully populated medal places from final round"
                : `Promoted ${totalPromoted} skater(s) from ${round} to ${targetRound} (limit ${promoteLimit})`,
        data: {
            eventId: competition.eventId,
            ageGroup: competition.ageGroup,
            name: category.name,
            fromRound: round,
            toRound: targetRound,
            qualificationType: promotionCtx.qualificationType,
            formulaId: promotionCtx.formulaId,
            formulaName: promotionCtx.formula?.formulaName,
            formulaRoundName: promotionCtx.formulaRound.roundName,
            promoteLimit,
            limitSource,
            groupSize: promotionCtx.formulaRound.groupSize ?? null,
            qualifyPerGroup: promotionCtx.formulaRound.qualifyPerGroup ?? null,
            promotedCount: totalPromoted,
            inRoundCount: currentRoundCount,
            category,
        },
    });
});

export {

    displayAllCompetition,
    displayCompetitionById,
    getChestNumbersByEvent,
    generateChestNumbers,
    getCompetitionDetailsByEvent,
    displayRound,
    updatePoints,
    promoteToNextRound,
}