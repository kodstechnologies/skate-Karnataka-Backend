import Joi from "joi";

const afterLoginSchoolFormValidation = {
    body: Joi.object({
        schoolName: Joi.string().min(3).max(100),

        board: Joi.string().allow("").max(50),

        district: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .messages({
                "string.pattern.base": "District must be a valid ObjectId",
            }),

        address: Joi.string().max(200).allow(""),

        principalName: Joi.string().allow("").max(100),

        schoolEmail: Joi.string().email().allow(""),

        schoolContactNumber: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .allow(""),

        /** Flutter sends `schoolContact` — normalized in controller before validate. */
        schoolContact: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .allow(""),

        skatingInfraAvailable: Joi.string(),

        skatingInfraInfo: Joi.string().allow("").max(200),

        lookingForSkatingService: Joi.string(),

        lookingForSkatingCoach: Joi.string(),

        skatingCoachInfo: Joi.string().allow("").max(200),

        coachName: Joi.string().allow(""),
        coachGender: Joi.string().allow(""),
        coachContact: Joi.string().allow(""),
        coachCertificates: Joi.string().allow(""),
        certifiedBy: Joi.string().allow(""),

        coachJoiningDate: Joi.alternatives()
            .try(Joi.date(), Joi.string())
            .allow("", null),

        img: Joi.string().uri().allow(""),

        documents: Joi.array().items(
            Joi.object({
                url: Joi.string().uri().required(),
                name: Joi.string().allow(""),
                uploadedAt: Joi.date().optional(),
            })
        ),
    }).min(1),
};

export {
    afterLoginSchoolFormValidation,
};
