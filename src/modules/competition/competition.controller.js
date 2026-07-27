import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    assertChestNumbersGeneratedForEvent,
    getChestNumberSummaryByEvent,
    syncEventCompetitionFromParticipants,
    triggerManualChestNumberGenerationForEvent,
} from "./skaterChestNo.service.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta } from "../../util/common/paginate.js";
import {
    formatCompetitionTimeDisplay,
    normalizeCompetitionTimeForStorage,
    parseCompetitionTimeTakenToSeconds,
} from "../../util/time/timeUtil.js";
import { getEventSkatingEventCategoriesFullRepository } from "../event/event.repositories.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import {
    getFormulaQualificationTypeForRound,
    getPromotionLimit,
    getQualificationTypeFromFormula,
    resolvePromotionContext,
} from "./competition.formulaResolve.js";
import {
    formatQualifyPositionLabel,
    selectFinalWinners,
    selectPromotedCompetitorsWithBreakdown,
} from "./competition.promotion.js";
import {
    buildCategoriesForAgeGroup,
    collectAgeGroupLabels,
    collectCompetitionSkaterIds,
    competitionCategoryNamesEqual,
    filterCompetitionCategoryByGender,
    filterCompetitorsByGender,
    findEventCategoryByQuery,
    findEventCategoryMeta,
    formatCategoryRoundDisplay,
    normalizeCompetitionGenderFilter,
    scopeResolvedSkatingCategories,
    toCategoryMetaFields,
    toCompetitionGenderLabel,
    toDisplayRoundCategoryOnly,
} from "./displayRound.util.js";

const loadCompetitionGenderBySkaterId = async (competitions = []) => {
    const skaterIds = collectCompetitionSkaterIds(competitions);
    if (!skaterIds.length) {
        return new Map();
    }

    const users = await BaseAuth.find({ _id: { $in: skaterIds } })
        .select("_id gender")
        .lean();

    return new Map(
        users.map((user) => [String(user._id), String(user.gender || "").trim().toLowerCase()])
    );
};

const competitionRoundHasSkaters = (competitions, { ageGroup, categoryName, round }) => {
    const normName = String(categoryName || "").trim().toLowerCase();
    const normRound = String(round || "").trim();

    return competitions.some((comp) => {
        if (ageGroup && String(comp.ageGroup || "").trim() !== String(ageGroup).trim()) {
            return false;
        }
        return (comp.categories || []).some(
            (cat) =>
                String(cat?.name || "").trim().toLowerCase() === normName &&
                Array.isArray(cat[normRound]) &&
                cat[normRound].length > 0
        );
    });
};

const normalizeCompetitionPosition = (value) => {
    const raw = String(value ?? "").trim();
    return raw === "1" || raw === "2" || raw === "3" ? raw : "0";
};

/** Fresh competitor row for the next round — never copy time/position from prior round. */
const cloneCompetitorForNextRound = (source) => ({
    skaterId: source?.skaterId,
    chestNo: String(source?.chestNo || ""),
    fullName: String(source?.fullName || ""),
    krsaId: String(source?.krsaId || ""),
    rsfiId: String(source?.rsfiId || ""),
    time: "",
    position: "0",
});

const hasNonEmptyTime = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

const hasProvidedPosition = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

const COMPETITION_ROUND_ORDER = ["1stRound", "2ndRound", "semiFinal", "final"];
const MEDAL_ROUNDS = ["1st", "2nd", "3rd"];

/** Persist round array on a Mongoose category subdocument. */
const setCategoryRound = (category, roundKey, rows) => {
    if (typeof category.set === "function") {
        category.set(roundKey, rows);
        return;
    }
    category[roundKey] = rows;
};

const toPlainCompetitorRow = (row) =>
    row && typeof row.toObject === "function" ? row.toObject() : row;

const countSkatersWithRecordedTime = (rows = []) =>
    rows.filter((row) => {
        const time = String(row?.time ?? "").trim();
        if (!time) {
            return false;
        }
        try {
            parseCompetitionTimeTakenToSeconds(time);
            return true;
        } catch {
            return false;
        }
    }).length;

/**
 * Changing an earlier round invalidates later rounds for the same category.
 * - 1stRound change → 2ndRound, semiFinal, final, medals all cleared
 * - 2ndRound change → 1stRound untouched; semiFinal+ and medals cleared
 * - semiFinal change → final + medals cleared
 * - final change → medals cleared
 */
const clearSubsequentRoundsInCategory = (category, updatedRound) => {
    const roundIndex = COMPETITION_ROUND_ORDER.indexOf(updatedRound);
    if (roundIndex < 0) {
        return;
    }

    const subsequentRounds = COMPETITION_ROUND_ORDER.slice(roundIndex + 1);

    for (const nextRound of subsequentRounds) {
        setCategoryRound(category, nextRound, []);
    }

    for (const medalRound of MEDAL_ROUNDS) {
        setCategoryRound(category, medalRound, []);
    }
};

/** Keep other-gender skaters; replace this gender's rows (or full replace when no gender filter). */
const mergeRoundRowsByGender = (
    existingRows,
    incomingRows,
    genderBySkaterId,
    genderFilter
) => {
    if (!genderFilter) {
        return incomingRows;
    }
    const kept = (existingRows || []).filter(
        (row) => genderBySkaterId.get(String(row?.skaterId || "")) !== genderFilter
    );
    return [...kept, ...(incomingRows || [])];
};

/** Clear later rounds/medals for this gender only; leave the other gender intact. */
const clearSubsequentRoundsInCategoryByGender = (
    category,
    updatedRound,
    genderBySkaterId,
    genderFilter
) => {
    if (!genderFilter) {
        clearSubsequentRoundsInCategory(category, updatedRound);
        return;
    }

    const roundIndex = COMPETITION_ROUND_ORDER.indexOf(updatedRound);
    if (roundIndex < 0) {
        return;
    }

    const subsequentRounds = COMPETITION_ROUND_ORDER.slice(roundIndex + 1);
    for (const nextRound of subsequentRounds) {
        setCategoryRound(
            category,
            nextRound,
            mergeRoundRowsByGender(
                category[nextRound],
                [],
                genderBySkaterId,
                genderFilter
            )
        );
    }

    for (const medalRound of MEDAL_ROUNDS) {
        setCategoryRound(
            category,
            medalRound,
            mergeRoundRowsByGender(
                category[medalRound],
                [],
                genderBySkaterId,
                genderFilter
            )
        );
    }
};

/** Partial update: only fields sent in the request are changed for this round. */
const applyCompetitorPointsUpdate = (competitor, { time, position }, qualificationType) => {
    if (hasNonEmptyTime(time)) {
        competitor.time = normalizeCompetitionTimeForStorage(time);
    }

    if (qualificationType === "POSITION") {
        if (hasProvidedPosition(position)) {
            competitor.position = normalizeCompetitionPosition(position);
        }
        return;
    }

    if (hasProvidedPosition(position)) {
        competitor.position = "0";
    }
};

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
    time: formatCompetitionTimeDisplay(c.time),
    position: c.position || "0",
});

const mapCompetitorForMedal = (source, medalPosition) => ({
    skaterId: source?.skaterId,
    chestNo: String(source?.chestNo || ""),
    fullName: String(source?.fullName || ""),
    krsaId: String(source?.krsaId || ""),
    rsfiId: String(source?.rsfiId || ""),
    time: formatCompetitionTimeDisplay(source?.time),
    position: normalizeCompetitionPosition(medalPosition),
});

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
 * Registration counts with chest numbers, grouped by event age group and lap.
 */
const getChestNumberSummary = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { page, limit, search, ageGroup, lap, discipline, gender } = req.query;
    const summary = await getChestNumberSummaryByEvent(eventId, {
        page,
        limit,
        search,
        ageGroup,
        lap,
        discipline,
        gender,
    });

    res.status(200).json({
        success: true,
        data: summary,
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

    const result = await triggerManualChestNumberGenerationForEvent(eventId);

    res.status(200).json({
        success: true,
        message: result.message,
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
        gender: genderQuery,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skipNum = (pageNum - 1) * limitNum;
    const genderFilter = normalizeCompetitionGenderFilter(genderQuery);
    const genderLabel = toCompetitionGenderLabel(genderQuery);

    const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
    if (!eventMeta) {
        throw new AppError("Event not found", 404);
    }

    await assertChestNumbersGeneratedForEvent(eventId);

    const skatingCategoryScopeId =
        categoryId || categoriesId || skatingEventCategoryId || null;
    const resolvedCategories = scopeResolvedSkatingCategories(
        eventMeta.skatingEventCategories || [],
        skatingCategoryScopeId
    );

    let categoryFilterName = name ? String(name).trim() : null;
    let resolvedCategoryMeta = null;

    const hasCategoryIdLookup = Boolean(skatingCategoryScopeId);

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

    let competitions = await EventCompetition.find(query).lean();

    // Only auto-sync when 1stRound is missing — not when a later round (e.g. 2ndRound) is empty
    // before promotion; syncing cannot fill later rounds and confuses "no skaters" reads.
    const shouldSyncCompetition =
        competitions.length === 0 ||
        (categoryFilterName &&
            !competitionRoundHasSkaters(competitions, {
                ageGroup,
                categoryName: categoryFilterName,
                round: "1stRound",
            }));

    if (shouldSyncCompetition) {
        await syncEventCompetitionFromParticipants(eventId, {
            ageGroup: ageGroup || null,
        });
        competitions = await EventCompetition.find(query).lean();
    }

    const genderBySkaterId = genderFilter
        ? await loadCompetitionGenderBySkaterId(competitions)
        : new Map();

    let totalSkatersCount = 0;

    const formattedCompetitions = competitions.map((comp) => {
        let filteredCategories = comp.categories || [];

        if (categoryFilterName) {
            filteredCategories = filteredCategories.filter((cat) =>
                competitionCategoryNamesEqual(cat.name, categoryFilterName)
            );
        }

        const formattedCategories = filteredCategories.map((cat) => {
            const scopedCat = filterCompetitionCategoryByGender(
                cat,
                genderBySkaterId,
                genderFilter
            );
            const meta =
                resolvedCategoryMeta &&
                competitionCategoryNamesEqual(scopedCat.name, categoryFilterName)
                    ? resolvedCategoryMeta
                    : findEventCategoryMeta(resolvedCategories, comp.ageGroup, scopedCat.name);

            const metaFields = toCategoryMetaFields(meta);

            const formatRoundList = (rows) =>
                Array.isArray(rows) && rows.length > 0
                    ? rows.map((row) => mapCompetitor(row))
                    : [];

            if (round) {
                const roundData =
                    scopedCat[round] && scopedCat[round].length > 0 ? scopedCat[round] : [];
                totalSkatersCount += roundData.length;
                const paginatedData = roundData
                    .slice(skipNum, skipNum + limitNum)
                    .map((row) => mapCompetitor(row));
                const qualificationType = getQualificationTypeFromFormula(
                    meta?.formula,
                    round
                );
                return {
                    name: scopedCat.name,
                    ...metaFields,
                    round,
                    qualificationType,
                    participants: paginatedData,
                };
            }

            return {
                name: scopedCat.name,
                ...metaFields,
                "1stRound": formatRoundList(scopedCat["1stRound"]),
                "2ndRound": formatRoundList(scopedCat["2ndRound"]),
                "semiFinal": formatRoundList(scopedCat["semiFinal"]),
                "final": formatRoundList(scopedCat["final"]),
                "1st": formatRoundList(scopedCat["1st"]),
                "2nd": formatRoundList(scopedCat["2nd"]),
                "3rd": formatRoundList(scopedCat["3rd"]),
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
        data: round
            ? formattedCompetitions.flatMap((comp) =>
                  (comp.categories || []).flatMap((cat) => cat.participants || [])
              )
            : formattedCompetitions,
        gender: genderLabel,
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
    const genderFilter = normalizeCompetitionGenderFilter(req.query.gender);
    const genderLabel = toCompetitionGenderLabel(req.query.gender);

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
    const genderBySkaterId = genderFilter
        ? await loadCompetitionGenderBySkaterId(competitions)
        : new Map();
    const competitionByAge = new Map(
        competitions.map((row) => [String(row.ageGroup || "").trim(), row])
    );

    const applyGenderToCategory = (categoryDoc) =>
        filterCompetitionCategoryByGender(categoryDoc, genderBySkaterId, genderFilter);

    const mapToRoundsOnly = (categoryDoc, formula, meta = {}) =>
        toDisplayRoundCategoryOnly(
            formatCategoryRoundDisplay(applyGenderToCategory(categoryDoc), formula, meta)
        );

    const genderPayload = {
        gender: genderLabel,
    };

    if (ageGroup && name) {
        const competition = competitionByAge.get(ageGroup) || null;
        const competitionCategory = competition
            ? (competition.categories || []).find((row) =>
                  competitionCategoryNamesEqual(row.name, name)
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
                ...genderPayload,
                category,
            },
        });
    }

    if (ageGroup) {
        const competition = competitionByAge.get(ageGroup) || null;
        const categories = buildCategoriesForAgeGroup({
            ageGroup,
            resolvedCategories: scopedCategories,
            competition: competition
                ? {
                      ...competition,
                      categories: (competition.categories || []).map(applyGenderToCategory),
                  }
                : null,
        }).map((row) => toDisplayRoundCategoryOnly(row));

        if (!categories.length) {
            throw new AppError("No categories configured for this age group", 404);
        }

        return res.status(200).json({
            success: true,
            data: {
                eventId,
                ageGroup,
                ...genderPayload,
                categories,
            },
        });
    }

    const ageGroupLabels = collectAgeGroupLabels(scopedCategories, competitions);
    const ageGroups = ageGroupLabels.map((label) => {
        const competition = competitionByAge.get(label) || null;
        return {
            ageGroup: label,
            categories: buildCategoriesForAgeGroup({
                ageGroup: label,
                resolvedCategories: scopedCategories,
                competition: competition
                    ? {
                          ...competition,
                          categories: (competition.categories || []).map(applyGenderToCategory),
                      }
                    : null,
            }).map((row) => toDisplayRoundCategoryOnly(row)),
        };
    });

    return res.status(200).json({
        success: true,
        data: {
            eventId,
            ...genderPayload,
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
    const genderFilter = normalizeCompetitionGenderFilter(req.body.gender);
    const genderLabel = toCompetitionGenderLabel(req.body.gender);

    let competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        await syncEventCompetitionFromParticipants(eventId, { ageGroup });
        competition = await EventCompetition.findOne({ eventId, ageGroup });
    }
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    const genderBySkaterId = genderFilter
        ? await loadCompetitionGenderBySkaterId([competition])
        : new Map();

    const assertSkaterMatchesGender = (id) => {
        if (!genderFilter) return;
        const skaterGender = genderBySkaterId.get(String(id));
        if (skaterGender !== genderFilter) {
            throw new AppError(
                `Skater does not match gender filter "${genderLabel}"`,
                400
            );
        }
    };

    const mapRoundCompetitors = (rows) =>
        filterCompetitorsByGender(rows || [], genderBySkaterId, genderFilter).map((row) =>
            mapCompetitor(row)
        );

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

    const validateCompetitorPayload = (comp, categoryName) => {
        if (!hasNonEmptyTime(comp.time) && !hasProvidedPosition(comp.position)) {
            throw new AppError(
                `At least one of time or position is required for category "${categoryName}"`,
                400
            );
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

        assertSkaterMatchesGender(skaterId);

        const qualificationType = await resolveQualificationType(foundCategory.name);
        validateCompetitorPayload({ time, position }, foundCategory.name);
        applyCompetitorPointsUpdate(
            foundCompetitor,
            { time, position },
            qualificationType
        );
        clearSubsequentRoundsInCategoryByGender(
            foundCategory,
            round,
            genderBySkaterId,
            genderFilter
        );

        responseCategories.push({
            name: foundCategory.name,
            qualificationType,
            competitors: mapRoundCompetitors(foundCategory[round]),
        });
    } else {
        for (const catUpdate of categories) {
            const { name, competitors } = catUpdate;
            if (!name || !Array.isArray(competitors)) {
                continue;
            }

            const category = competition.categories.find((row) =>
                competitionCategoryNamesEqual(row.name, name)
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
                validateCompetitorPayload(comp, category.name);
                assertSkaterMatchesGender(comp.skaterId);

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

            clearSubsequentRoundsInCategoryByGender(
                category,
                round,
                genderBySkaterId,
                genderFilter
            );

            responseCategories.push({
                name: category.name,
                qualificationType,
                competitors: mapRoundCompetitors(category[round]),
            });
        }
    }

    competition.markModified("categories");
    await competition.save();

    res.status(200).json({
        success: true,
        message: "Points updated successfully",
        data: {
            eventId: competition.eventId,
            ageGroup: competition.ageGroup,
            round: round,
            gender: genderLabel,
            categories: responseCategories,
        },
    });
});

/**
 * Promote qualified skaters from the current round to the next (formula qualifyCount).
 *
 * Body: { eventId, ageGroup, round, name, skatingEventCategoryId?, gender? }
 */
const promoteToNextRound = asyncHandler(async (req, res) => {
    const { eventId, ageGroup, round, name } = req.body;
    const skatingEventCategoryId =
        req.body.skatingEventCategoryId ||
        req.body.skatingEventCategories ||
        req.body.categoriesId ||
        req.body.categoryId ||
        null;
    const genderFilter = normalizeCompetitionGenderFilter(req.body.gender);
    const genderLabel = toCompetitionGenderLabel(req.body.gender);

    let competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        await syncEventCompetitionFromParticipants(eventId, { ageGroup });
        competition = await EventCompetition.findOne({ eventId, ageGroup });
    }
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    const category = competition.categories.find((row) =>
        competitionCategoryNamesEqual(row.name, name)
    );

    if (!category) {
        throw new AppError(`Category "${name}" not found for age group ${ageGroup}`, 404);
    }

    const genderBySkaterId = genderFilter
        ? await loadCompetitionGenderBySkaterId([competition])
        : new Map();

    const allCurrentRoundData = (category[round] || []).map(toPlainCompetitorRow);
    const currentRoundData = filterCompetitorsByGender(
        allCurrentRoundData,
        genderBySkaterId,
        genderFilter
    );

    if (!currentRoundData.length) {
        throw new AppError(
            genderFilter
                ? `No ${genderLabel} skaters in ${round} for "${name}"`
                : `No skaters in ${round} for "${name}"`,
            400
        );
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

    const { limit: promoteLimit, limitSource, threshold } = getPromotionLimit(
        promotionCtx.formulaRound,
        { currentRoundCount, competitionRound: round }
    );

    if (promoteLimit == null || promoteLimit <= 0) {
        throw new AppError(
            round === "1stRound"
                ? `Formula 1stRound needs qualifyCountLessThan65 and/or qualifyCountMoreThan65 (maxParticipants threshold ${threshold ?? 65}).`
                : `Formula round "${round}" needs qualifyCount (fixed number — less/more than 65 applies to 1stRound only).`,
            400
        );
    }

    let totalPromoted = 0;
    let promotionBreakdown = null;

    if (targetRound === "winners") {
        const { firstPlace, secondPlace, thirdPlace } = selectFinalWinners(
            currentRoundData,
            promotionCtx.finalSelectionCount,
            getSecondsFromTime
        );

        setCategoryRound(
            category,
            "1st",
            mergeRoundRowsByGender(
                category["1st"],
                firstPlace ? [mapCompetitorForMedal(firstPlace, "1")] : [],
                genderBySkaterId,
                genderFilter
            )
        );
        setCategoryRound(
            category,
            "2nd",
            mergeRoundRowsByGender(
                category["2nd"],
                secondPlace ? [mapCompetitorForMedal(secondPlace, "2")] : [],
                genderBySkaterId,
                genderFilter
            )
        );
        setCategoryRound(
            category,
            "3rd",
            mergeRoundRowsByGender(
                category["3rd"],
                thirdPlace ? [mapCompetitorForMedal(thirdPlace, "0")] : [],
                genderBySkaterId,
                genderFilter
            )
        );
        totalPromoted =
            (firstPlace ? 1 : 0) + (secondPlace ? 1 : 0) + (thirdPlace ? 1 : 0);
    } else {
        promotionBreakdown = selectPromotedCompetitorsWithBreakdown(
            currentRoundData,
            promoteLimit,
            promotionCtx.qualificationType,
            getSecondsFromTime,
            promotionCtx.formulaRound
        );

        if (!promotionBreakdown.promoted.length) {
            const perGroup = promotionCtx.formulaRound?.qualifyPerGroup ?? 1;
            const timedCount = countSkatersWithRecordedTime(currentRoundData);
            throw new AppError(
                promotionCtx.qualificationType === "POSITION"
                    ? `No skaters qualify (POSITION: marked position ${formatQualifyPositionLabel(perGroup)} then fastest times to reach ${promoteLimit})`
                    : `No skaters with valid times to promote (${timedCount} of ${currentRoundData.length} have a recorded time; fastest ${promoteLimit} required)`,
                400
            );
        }

        setCategoryRound(
            category,
            targetRound,
            mergeRoundRowsByGender(
                category[targetRound],
                promotionBreakdown.promoted.map(cloneCompetitorForNextRound),
                genderBySkaterId,
                genderFilter
            )
        );
        totalPromoted = promotionBreakdown.promoted.length;

        // Only this gender's later rounds + medals are cleared; other gender kept.
        clearSubsequentRoundsInCategoryByGender(
            category,
            targetRound,
            genderBySkaterId,
            genderFilter
        );
    }

    if (totalPromoted === 0) {
        throw new AppError(`No skaters qualified to progress from "${round}"`, 400);
    }

    const categoryIndex = competition.categories.findIndex((row) =>
        competitionCategoryNamesEqual(row.name, name)
    );
    competition.markModified("categories");
    if (categoryIndex >= 0) {
        competition.markModified(`categories.${categoryIndex}`);
        if (targetRound !== "winners") {
            competition.markModified(`categories.${categoryIndex}.${targetRound}`);
        }
    }
    await competition.save();

    const saved = await EventCompetition.findOne({ eventId, ageGroup });
    const savedCategory = saved?.categories?.find((row) =>
        competitionCategoryNamesEqual(row.name, name)
    );

    const mapFiltered = (rows) =>
        filterCompetitorsByGender(rows || [], genderBySkaterId, genderFilter).map((row) =>
            mapCompetitor(row)
        );

    const nextRoundParticipants =
        targetRound === "winners"
            ? {
                  "1st": mapFiltered(savedCategory?.["1st"]),
                  "2nd": mapFiltered(savedCategory?.["2nd"]),
                  "3rd": mapFiltered(savedCategory?.["3rd"]),
              }
            : mapFiltered(savedCategory?.[targetRound]);

    const promotedIds = new Set(
        (promotionBreakdown?.promoted || []).map((row) => String(row.skaterId))
    );
    const notPromoted =
        promotionBreakdown?.promoted?.length
            ? currentRoundData
                  .filter((row) => !promotedIds.has(String(row.skaterId)))
                  .map((row) => ({
                      ...mapCompetitor(row),
                      reason: countSkatersWithRecordedTime([row])
                          ? "exceeded_formula_limit"
                          : "no_valid_time",
                  }))
            : [];

    res.status(200).json({
        success: true,
        message:
            targetRound === "winners"
                ? "Successfully populated medal places from final round"
                : `Promoted ${totalPromoted} of ${currentRoundData.length} skater(s) from ${round} to ${targetRound} (${promotionCtx.qualificationType}, formula limit ${promoteLimit})`,
        data: {
            eventId: saved?.eventId ?? competition.eventId,
            ageGroup: saved?.ageGroup ?? competition.ageGroup,
            name: savedCategory?.name ?? category.name,
            gender: genderLabel,
            fromRound: round,
            toRound: targetRound,
            qualificationType: promotionCtx.qualificationType,
            promotionLimit: promoteLimit,
            limitSource,
            totalInFromRound: currentRoundData.length,
            promotedCount: totalPromoted,
            promotedSkaters: nextRoundParticipants,
            notPromoted,
            [targetRound]: nextRoundParticipants,
        },
    });
});

export {

    displayAllCompetition,
    displayCompetitionById,
    getChestNumbersByEvent,
    getChestNumberSummary,
    generateChestNumbers,
    getCompetitionDetailsByEvent,
    displayRound,
    updatePoints,
    promoteToNextRound,
}