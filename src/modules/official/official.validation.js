import Joi from "joi";
const afterLoginOfficialFormValidation = {
    body: Joi.object({

        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)

            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 3 characters long",
                "string.max": "Full name cannot exceed 50 characters",
                "any.required": "Full name is required",
            }),

        district: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)

            .messages({
                "string.pattern.base": "District must be a valid ObjectId",
                "any.required": "District is required",
            }),

        club: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)

            .messages({
                "string.pattern.base": "Club must be a valid ObjectId",
                "any.required": "Club is required",
            }),

        experience: Joi.number().min(0).max(50).messages({
            "number.base": "Experience must be a number",
        }),

        technicalTrainingCourse: Joi.string().allow(""),

        coachingExperience: Joi.string().allow(""),

        isSkater: Joi.string().allow(""),
        skaterDetails: Joi.string().allow(""),
        isOfficiating: Joi.string().allow(""),
        officiatingDetails: Joi.string().allow(""),
        conductingClasses: Joi.string().allow(""),
        conductingClassesDetails: Joi.string().allow(""),

        coaching: Joi.string().allow(""),
        officiating: Joi.string().allow(""),

        officialContactNumber: Joi.string().allow(""),
        officialEmail: Joi.string().allow(""),

    })

};

export {
    afterLoginOfficialFormValidation,
}