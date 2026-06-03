import Joi from "joi";

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "{{#label}} must be a valid 24-character hex id",
    });

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
});

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
}).custom((value, helpers) => {
    if (value.time === undefined && value.position === undefined) {
        return helpers.error("any.custom", {
            message: "At least one of time or position is required",
        });
    }
    return value;
}).messages({
    "any.custom": "{{#message}}",
});

export const updatePointsValidation = {
    body: Joi.alternatives().try(bulkUpdateBody, singleUpdateBody),
};
