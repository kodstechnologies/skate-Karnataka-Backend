import { asyncHandler } from "../../util/common/asyncHandler.js";
import { generateChestNumbersForEvent } from "./skaterChestNo.service.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta } from "../../util/common/paginate.js";
import { parseCompetitionTimeTakenToSeconds } from "../../util/time/timeUtil.js";
import { Event } from "../event/event.model.js";
import { getEventSkatingEventCategoriesFullRepository } from "../event/event.repositories.js";
import { resolveSkatingCategoriesForEvent } from "../event/skatingEventCategory.sync.js";
import {
    getFormulaQualificationTypeForRound,
    getQualificationTypeFromFormula,
} from "./competition.formulaResolve.js";
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
    competitor.time = time;
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
 * Promote qualified skaters from the current round to the next round.
 *
 * Body: { eventId, ageGroup, round }
 *
 * Progression logic (per category):
 *   - 1stRound:
 *     - If skaters > 60: promotes top 24 to 2ndRound
 *     - If skaters <= 60: promotes top 12 to semiFinal (skips 2ndRound)
 *   - 2ndRound:
 *     - Promotes top 12 to semiFinal
 *   - semiFinal:
 *     - Promotes top 8 to final
 *   - final:
 *     - Places top 3 into 1st, 2nd, and 3rd place arrays
 */
const promoteToNextRound = asyncHandler(async (req, res) => {
    const { eventId, ageGroup, round, name } = req.body;

    const competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    let totalPromoted = 0;
    let targetRoundName = "";

    for (const category of competition.categories) {
        if (!category.name || category.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            continue;
        }

        const currentRoundData = category[round] || [];
        if (currentRoundData.length === 0) continue;

        let targetRound;
        let limit;

        if (round === "1stRound") {
            targetRound = "2ndRound";
        } else if (round === "2ndRound") {
            targetRound = "semiFinal";
        } else if (round === "semiFinal") {
            targetRound = "final";
        } else if (round === "final") {
            targetRound = "winners";
        }

        if (!targetRound) continue;
        targetRoundName = targetRound;

        // Try to fetch formula from DB
        let formulaRound = null;
        try {
            const eventDoc = await Event.findById(eventId)
                .populate({
                    path: "skatingEventCategories",
                    populate: [
                        { path: "ageGroups.categories.formula" },
                        { path: "clubOverrides.ageGroups.categories.formula" },
                        { path: "districtOverrides.ageGroups.categories.formula" }
                    ]
                })
                .lean();

            if (eventDoc) {
                const resolvedCategories = resolveSkatingCategoriesForEvent(eventDoc, eventDoc.skatingEventCategories || []);
                let foundSubCategory = null;
                for (const rc of resolvedCategories) {
                    const ageGroupEntry = (rc.ageGroups || []).find(
                        (g) => String(g.label || "").trim().toLowerCase() === String(ageGroup).trim().toLowerCase()
                    );
                    if (ageGroupEntry) {
                        const subCat = (ageGroupEntry.categories || []).find(
                            (c) => String(c.name || "").trim().toLowerCase() === String(name).trim().toLowerCase()
                        );
                        if (subCat) {
                            foundSubCategory = subCat;
                            break;
                        }
                    }
                }

                if (foundSubCategory && foundSubCategory.formula) {
                    const formulaObj = foundSubCategory.formula;
                    const normRound = round.toLowerCase();
                    let searchNames = [];
                    if (normRound === "1stround") {
                        searchNames = ["1stround"];
                    } else if (normRound === "2ndround") {
                        searchNames = ["2ndround", "quarterfinal"];
                    } else if (normRound === "semifinal") {
                        searchNames = ["semifinal"];
                    } else if (normRound === "final") {
                        searchNames = ["final"];
                    }

                    formulaRound = (formulaObj.rounds || []).find((r) =>
                        searchNames.includes(String(r.roundName || "").toLowerCase())
                    );
                }
            }
        } catch (err) {
            console.error("Error loading formula for competition promotion:", err);
        }

        if (formulaRound) {
            const totalSkaters = (category["1stRound"] || []).length || currentRoundData.length;
            const maxThreshold =
                Number(formulaRound.maxParticipants) > 0
                    ? Number(formulaRound.maxParticipants)
                    : 65;
            if (totalSkaters >= maxThreshold) {
                limit =
                    formulaRound.qualifyCountMoreThan65 ??
                    formulaRound.qualifyCount ??
                    currentRoundData.length;
            } else {
                limit =
                    formulaRound.qualifyCountLessThan65 ??
                    formulaRound.qualifyCount ??
                    currentRoundData.length;
            }
        } else {
            // Default fallback logic
            if (round === "1stRound") {
                const totalSkaters = currentRoundData.length;
                if (totalSkaters > 60) {
                    limit = 24;
                } else {
                    limit = totalSkaters;
                }
            } else if (round === "2ndRound") {
                limit = 12;
            } else if (round === "semiFinal") {
                limit = 8;
            }
        }

        if (targetRound === "winners") {
            // Find skaters in final round and place in 1st, 2nd, 3rd arrays
            let firstPlace = currentRoundData.find(c => c.position === "1");
            let secondPlace = currentRoundData.find(c => c.position === "2");

            const remaining = currentRoundData
                .filter(c => c !== firstPlace && c !== secondPlace)
                .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

            if (!firstPlace && remaining.length > 0) {
                firstPlace = remaining.shift();
            }
            if (!secondPlace && remaining.length > 0) {
                secondPlace = remaining.shift();
            }
            const thirdPlace = remaining.length > 0 ? remaining[0] : null;

            category["1st"] = firstPlace ? [mapCompetitor(firstPlace)] : [];
            category["2nd"] = secondPlace ? [mapCompetitor(secondPlace)] : [];
            category["3rd"] = thirdPlace ? [mapCompetitor(thirdPlace)] : [];

            totalPromoted += (firstPlace ? 1 : 0) + (secondPlace ? 1 : 0) + (thirdPlace ? 1 : 0);
        } else {
            // 1. Auto-promote: position "1" or "2"
            const autoPromoted = currentRoundData.filter(
                (c) => c.position === "1" || c.position === "2"
            );

            // 2. Time-based: remaining skaters with a non-empty time, sorted ascending
            const autoIds = new Set(autoPromoted.map((c) => String(c.skaterId)));
            const remainingWithTime = currentRoundData
                .filter((c) => !autoIds.has(String(c.skaterId)) && c.time && c.time.trim() !== "")
                .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

            // Combine up to limit
            const promoted = [...autoPromoted, ...remainingWithTime].slice(0, limit);

            category[targetRound] = promoted.map(mapCompetitorWithReset);
            totalPromoted += promoted.length;
        }
    }

    if (totalPromoted === 0) {
        throw new AppError(
            `No skaters qualified to progress from "${round}"`,
            400
        );
    }

    await competition.save();

    const matchedCategory = competition.categories.find(
        (c) => c.name && c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    res.status(200).json({
        success: true,
        message: targetRoundName === "winners"
            ? `Successfully populated 1st, 2nd, 3rd places from final round`
            : `Promoted ${totalPromoted} skater(s) from ${round} to ${targetRoundName}`,
        data: {
            eventId: competition.eventId,
            ageGroup: competition.ageGroup,
            category: matchedCategory
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