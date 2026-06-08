import Joi from "joi";
import { AGE_GROUPS } from "../event/SkatingEventCategory.model.js";

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "{{#label}} must be a valid 24-character hex id",
    });

const hasNonEmptyTime = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

const hasProvidedPosition = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

const requireTimeOrPosition = (value, helpers) => {
    if (!hasNonEmptyTime(value?.time) && !hasProvidedPosition(value?.position)) {
        return helpers.message({
            custom: "At least one of time or position is required",
        });
    }
    return value;
};

const competitorUpdateItem = Joi.object({
    skaterId: objectIdString.required(),
    time: Joi.string().trim().allow("").optional(),
    position: Joi.string()
        .trim()
        .valid("0", "1", "2")
        .optional()
        .messages({
            "any.only": "position must be one of: 0, 1, 2",
        }),
}).custom(requireTimeOrPosition);

const categoryUpdateItem = Joi.object({
    name: Joi.string().trim().min(1).required(),
    competitors: Joi.array().items(competitorUpdateItem).min(1).required(),
});

// Bulk update: pass categories array with competitors
const bulkUpdateBody = Joi.object({
    eventId: objectIdString.required(),
    ageGroup: Joi.string().trim().min(1).required(),
    round: Joi.string()
        .trim()
        .valid("1stRound", "2ndRound", "semiFinal", "final")
        .required()
        .messages({
            "any.only": "round must be one of: 1stRound, 2ndRound, semiFinal, final",
        }),
    skatingEventCategoryId: objectIdString.optional(),
    skatingEventCategories: objectIdString.optional(),
    categoriesId: objectIdString.optional(),
    categories: Joi.array().items(categoryUpdateItem).min(1).required(),
    skaterId: Joi.forbidden(),
    time: Joi.forbidden(),
    position: Joi.forbidden(),
});

// Single skater update: pass skaterId directly with time/position
const singleUpdateBody = Joi.object({
    eventId: objectIdString.required(),
    ageGroup: Joi.string().trim().min(1).required(),
    round: Joi.string()
        .trim()
        .valid("1stRound", "2ndRound", "semiFinal", "final")
        .required()
        .messages({
            "any.only": "round must be one of: 1stRound, 2ndRound, semiFinal, final",
        }),
    skatingEventCategoryId: objectIdString.optional(),
    skatingEventCategories: objectIdString.optional(),
    categoriesId: objectIdString.optional(),
    skaterId: objectIdString.required(),
    time: Joi.string().trim().allow("").optional(),
    position: Joi.string()
        .trim()
        .valid("0", "1", "2")
        .optional()
        .messages({
            "any.only": "position must be one of: 0, 1, 2",
        }),
    categories: Joi.forbidden(),
}).custom(requireTimeOrPosition);

export const updatePointsValidation = {
    body: Joi.alternatives().try(bulkUpdateBody, singleUpdateBody),
};

export const promoteToNextRoundValidation = {
    body: Joi.object({
        eventId: objectIdString.required(),
        ageGroup: Joi.string().trim().min(1).required(),
        round: Joi.string()
            .trim()
            .valid("1stRound", "2ndRound", "semiFinal", "final")
            .required()
            .messages({
                "any.only": "round must be one of: 1stRound, 2ndRound, semiFinal, final",
            }),
        name: Joi.string().trim().min(1).required(),
        skatingEventCategoryId: objectIdString.optional(),
        skatingEventCategories: objectIdString.optional(),
        categoriesId: objectIdString.optional(),
        categoryId: objectIdString.optional(),
    }),
};

const competitionAgeGroupLabel = Joi.string()
    .trim()
    .valid(...AGE_GROUPS.map((group) => group.label))
    .messages({
        "any.only": `ageGroup must be one of: ${AGE_GROUPS.map((group) => group.label).join(", ")}`,
    });

export const displayRoundQueryValidation = {
    params: Joi.object({
        eventId: objectIdString.required(),
    }),
    query: Joi.object({
        ageGroup: competitionAgeGroupLabel.optional(),
        name: Joi.string().trim().min(1).optional(),
        skatingEventCategories: objectIdString.optional(),
        skatingEventCategoryId: objectIdString.optional(),
        categoriesId: objectIdString.optional(),
        categoryId: objectIdString.optional(),
    }),
};

export const chestNumberSummaryQueryValidation = {
    params: Joi.object({
        eventId: objectIdString.required(),
    }),
    query: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().trim().allow("").optional(),
        ageGroup: Joi.string().trim().allow("").optional(),
        lap: Joi.string().trim().allow("").optional(),
        discipline: Joi.string().trim().allow("").optional(),
    }),
};

export const fullDetailsQueryValidation = {
    params: Joi.object({
        eventId: objectIdString.required(),
    }),
    query: Joi.object({
        ageGroup: competitionAgeGroupLabel.optional(),
        name: Joi.string().trim().min(1).optional(),
        categoryId: objectIdString.optional(),
        categoriesId: objectIdString.optional(),
        skatingEventCategoryId: objectIdString.optional(),
        round: Joi.string()
            .trim()
            .valid("1stRound", "2ndRound", "semiFinal", "final")
            .optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};
