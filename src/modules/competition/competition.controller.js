import { asyncHandler } from "../../util/common/asyncHandler.js";
import { generateChestNumbersForEvent } from "./skaterChestNo.service.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta } from "../../util/common/paginate.js";

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
    const { ageGroup, name, round, page, limit } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skipNum = (pageNum - 1) * limitNum;

    const query = { eventId };
    if (ageGroup) {
        query.ageGroup = ageGroup;
    }

    const competitions = await EventCompetition.find(query).lean();

    let totalSkatersCount = 0;

    const formattedCompetitions = competitions.map(comp => {
        let filteredCategories = comp.categories || [];

        if (name) {
            filteredCategories = filteredCategories.filter(
                cat => cat.name && cat.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
        }

        const formattedCategories = filteredCategories.map(cat => {
            if (round) {
                const roundData = cat[round] && cat[round].length > 0 ? cat[round] : [];
                totalSkatersCount += roundData.length;
                const paginatedData = roundData.slice(skipNum, skipNum + limitNum);
                return {
                    name: cat.name,
                    [round]: paginatedData
                };
            }

            return {
                name: cat.name,
                "1stRound": cat["1stRound"] && cat["1stRound"].length > 0 ? cat["1stRound"] : "pending",
                "2ndRound": cat["2ndRound"] && cat["2ndRound"].length > 0 ? cat["2ndRound"] : "pending",
                "semiFinal": cat["semiFinal"] && cat["semiFinal"].length > 0 ? cat["semiFinal"] : "pending",
                "final": cat["final"] && cat["final"].length > 0 ? cat["final"] : "pending",
                "1st": cat["1st"] && cat["1st"].length > 0 ? cat["1st"] : "pending",
                "2nd": cat["2nd"] && cat["2nd"].length > 0 ? cat["2nd"] : "pending",
                "3rd": cat["3rd"] && cat["3rd"].length > 0 ? cat["3rd"] : "pending",
            };
        });

        return {
            ...comp,
            categories: formattedCategories
        };
    });

    const responseJson = {
        success: true,
        data: formattedCompetitions,
    };

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
 * Display competition round details for an event, filtered by age group and category name.
 */
const displayRound = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { ageGroup, name } = req.query;

    const query = { eventId };
    if (ageGroup) {
        query.ageGroup = ageGroup;
    }

    const competition = await EventCompetition.findOne(query).lean();
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    let category = null;
    if (name) {
        category = (competition.categories || []).find(
            cat => cat.name && cat.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
    } else {
        category = (competition.categories || [])[0]; // fallback to first category if name not provided
    }

    if (!category) {
        throw new AppError("Category not found", 404);
    }

    // Format the category rounds
    const formattedCategory = {
        name: category.name,
        rounds: [
            { round: "1stRound", status: !!(category["1stRound"] && category["1stRound"].length > 0) },
            { round: "2ndRound", status: !!(category["2ndRound"] && category["2ndRound"].length > 0) },
            { round: "semiFinal", status: !!(category["semiFinal"] && category["semiFinal"].length > 0) },
            { round: "final", status: !!(category["final"] && category["final"].length > 0) }
        ],
        "1st": !!(category["1st"] && category["1st"].length > 0),
        "2nd": !!(category["2nd"] && category["2nd"].length > 0),
        "3rd": !!(category["3rd"] && category["3rd"].length > 0),
    };

    res.status(200).json({
        success: true,
        data: {
            eventId: competition.eventId,
            ageGroup: competition.ageGroup,
            category: formattedCategory
        }
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

    const competition = await EventCompetition.findOne({ eventId, ageGroup });
    if (!competition) {
        throw new AppError("No competition found for the given event and age group", 404);
    }

    if (skaterId) {
        // Single skater update: find the skater across all categories in the round
        let found = false;
        for (const category of competition.categories) {
            const roundData = category[round] || [];
            const competitor = roundData.find(
                (r) => String(r.skaterId) === String(skaterId)
            );
            if (competitor) {
                if (time !== undefined) competitor.time = time;
                if (position !== undefined) competitor.position = position;
                found = true;
                break;
            }
        }
        if (!found) {
            throw new AppError("Skater not found in any category for the given round", 404);
        }
    } else {
        // Bulk update via categories array
        for (const catUpdate of categories) {
            const { name, competitors } = catUpdate;
            if (!name || !Array.isArray(competitors)) continue;

            const category = competition.categories.find(
                (c) => c.name && c.name.trim().toLowerCase() === name.trim().toLowerCase()
            );

            if (!category) continue;

            const roundData = category[round] || [];

            for (const comp of competitors) {
                const competitor = roundData.find(
                    (r) => String(r.skaterId) === String(comp.skaterId)
                );

                if (competitor) {
                    if (comp.time !== undefined) competitor.time = comp.time;
                    if (comp.position !== undefined) competitor.position = comp.position;
                }
            }
        }
    }

    await competition.save();

    res.status(200).json({
        success: true,
        message: "Points updated successfully",
        data: competition,
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
}