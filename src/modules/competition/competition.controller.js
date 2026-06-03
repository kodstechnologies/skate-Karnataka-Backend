import { asyncHandler } from "../../util/common/asyncHandler.js";
import { generateChestNumbersForEvent } from "./skaterChestNo.service.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { AppError } from "../../util/common/AppError.js";

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

export {
    displayAllCompetition,
    displayCompetitionById,
    getChestNumbersByEvent,
    generateChestNumbers,
}