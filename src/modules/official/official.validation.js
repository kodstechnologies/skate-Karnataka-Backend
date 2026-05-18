import Joi from "joi";

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "must be a valid 24-character hex id",
    });

const multipartNumber = (schema) =>
    Joi.alternatives().try(
        schema,
        Joi.string().trim().custom((value, helpers) => {
            if (value === "") return undefined;
            const parsed = Number(value);
            if (Number.isNaN(parsed)) {
                return helpers.error("number.base");
            }
            const { error, value: coerced } = schema.validate(parsed);
            if (error) {
                return helpers.error("number.base");
            }
            return coerced;
        })
    );

const afterLoginOfficialFormValidation = {
    body: Joi.object({
        fullName: Joi.string().trim().min(3).max(50).optional(),
        district: objectIdString.optional(),
        club: objectIdString.optional(),
        experience: multipartNumber(Joi.number().min(0).max(50)).optional(),
        technicalTrainingCourse: Joi.string().trim().allow("").optional(),
        coachingExperience: Joi.string().trim().allow("").optional(),
        isSkater: Joi.string().trim().allow("").optional(),
        skaterDetails: Joi.string().trim().allow("").optional(),
        isOfficiating: Joi.string().trim().allow("").optional(),
        officiatingDetails: Joi.string().trim().allow("").optional(),
        conductingClasses: Joi.string().trim().allow("").optional(),
        conductingClassesDetails: Joi.string().trim().allow("").optional(),
        coaching: Joi.string().trim().allow("").optional(),
        officiating: Joi.string().trim().allow("").optional(),
        officialContactNumber: Joi.string().trim().allow("").optional(),
        officialEmail: Joi.string().trim().email().allow("").optional(),
        img: Joi.string().uri().allow("").optional(),
        documents: Joi.array()
            .items(
                Joi.object({
                    url: Joi.string().uri().allow(""),
                    name: Joi.string().allow(""),
                    uploadedAt: Joi.date().optional(),
                })
            )
            .optional(),
    }).min(1),
};

export {
    afterLoginOfficialFormValidation,
}