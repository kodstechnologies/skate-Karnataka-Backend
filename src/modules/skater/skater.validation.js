import Joi from "joi";
import { parseDobInput } from "../../util/time/timeUtil.js";

const afterLoginSkaterFormValidation = {
    body: Joi.object({
        fullName: Joi.string().min(2).max(100),
        phone: Joi.string(),
        rsfiId: Joi.string().allow("").optional(),

        dob: Joi.any()
            .optional()
            .custom((value, helpers) => {
                if (value === undefined || value === null || value === "") {
                    return undefined;
                }
                try {
                    return parseDobInput(value);
                } catch (err) {
                    return helpers.error("any.invalid", {
                        message: err.message || "Invalid date of birth",
                    });
                }
            }),

        aadharNumber: Joi.string()
            .pattern(/^[0-9]{12}$/)
            .messages({
                "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
                "string.empty": "Aadhaar number is required",
            }),
        

        gender: Joi.string()
            .valid("male", "female", "other")
        ,

        category: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/),
        discipline: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/),

        address: Joi.string().max(200),

        district: Joi.string(), // ObjectId (string)
        club: Joi.string(),     // ObjectId (string)

        parent: Joi.string(),

        bloodGroup: Joi.string()
            .valid("A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-")
        ,
        school: Joi.string(),
        grade: Joi.string(),

        signature: Joi.string().allow("").optional(),
        photo: Joi.string().uri().optional().allow(""),
        documents: Joi.array()
            .items(
                Joi.object({
                    url: Joi.string().uri().required(),
                    name: Joi.string().optional().allow(""),
                    uploadedAt: Joi.date().optional(),
                })
            )
            .optional(),
    })
};


const eventIdParamValidation = {
    params: Joi.object({
        id: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
    }),
};

const getSkaterResultsByEventValidation = {
    ...eventIdParamValidation,
    query: Joi.object({
        categoryName: Joi.string().trim().optional(),
        category: Joi.string().trim().optional(),
    }),
};

const getSkaterResultsEventRoundsValidation = {
    ...eventIdParamValidation,
    query: Joi.object({
        name: Joi.string().trim().optional(),
        categoryName: Joi.string().trim().optional(),
        category: Joi.string().trim().optional(),
        label: Joi.string().trim().optional(),
    }),
};

const COMPETITION_ROUND_QUERY = Joi.string()
    .trim()
    .required()
    .valid(
        "1stRound",
        "2ndRound",
        "semiFinal",
        "final",
        "1st",
        "2nd",
        "3rd",
        "1stround",
        "2ndround",
        "semifinal",
        "quarterfinal"
    )
    .messages({
        "any.only":
            "round must be one of: 1stRound, 2ndRound, semiFinal, final, 1st, 2nd, 3rd",
    });

const getSkaterResultsEventAllSkatersValidation = {
    ...eventIdParamValidation,
    query: Joi.object({
        categoryName: Joi.string().trim().required(),
        category: Joi.string().trim().optional(),
        name: Joi.string().trim().optional(),
        round: COMPETITION_ROUND_QUERY,
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(50),
    }),
};

const UpdateProfileValidation = {
    body: Joi.object({
        fullName: Joi.string().min(3).max(50).optional(),
        dob: Joi.date().iso().optional(),
        district: Joi.string().optional(),
        email: Joi.string().email().optional(),
        photo: Joi.string().optional()
    })
};

const SkaterRsfiChangeValidation = {
    body: Joi.object({
        rsfiId: Joi.string().trim().min(1).optional(),
        // rfsiId: Joi.string().trim().min(1).optional(),
    })
        .or("rsfiId", "rfsiId")
        .messages({
            "object.missing": "RSFI ID (rsfiId) is required",
        }),
};


export {
    afterLoginSkaterFormValidation,
    eventIdParamValidation,
    getSkaterResultsByEventValidation,
    getSkaterResultsEventRoundsValidation,
    getSkaterResultsEventAllSkatersValidation,
    UpdateProfileValidation,
    SkaterRsfiChangeValidation,
}
