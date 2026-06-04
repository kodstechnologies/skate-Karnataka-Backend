import Joi from "joi"

const createClubValidation = {
    body: Joi.object({
        district: Joi.string().required(),
        name: Joi.string().required(),
        img: Joi.string().allow(""),
        address: Joi.string().required(),
        about: Joi.string().allow(""),
        fullName: Joi.string().trim().min(3).max(50).optional().allow(""),
        phone: Joi.string()
            .trim()
            .pattern(/^[6-9]\d{9}$/)
            .optional()
            .allow(""),
        gender: Joi.string().valid("male", "female", "other").lowercase().optional().allow(""),
        email: Joi.string().trim().email().lowercase().optional().allow(""),
    })
}

const editClubValidation = {
    body: Joi.object({
        district: Joi.string(),
        name: Joi.string(),
        address: Joi.string(),
        about: Joi.string().allow(""),
         fullName: Joi.string().allow(""),
        phone: Joi.string().allow(""),
        gender: Joi.string().allow(""),
        email: Joi.string().allow(""),
        formulaSource: Joi.string().valid("admin", "club", "both").optional(),
    })
}

const clubFormulaSourceValidation = {
    body: Joi.object({
        formulaSource: Joi.string()
            .valid("admin", "club", "both")
            .required()
            .messages({
                "any.only": "formulaSource must be admin, club, or both",
            }),
    }),
};


const addSkaterValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.empty": "Full name is required",
                "any.required": "Full name is required",
            }),
        phone: Joi.string()
            .trim()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone must be a valid 10-digit Indian number",
                "any.required": "Phone is required",
            }),
        address: Joi.string()
            .trim()
            .min(5)
            .max(200)
            .required()
            .messages({
                "string.empty": "Address is required",
                "any.required": "Address is required",
            }),
        gender: Joi.string()
            .valid("male", "female", "other")
            .lowercase()
            .required()
            .messages({
                "any.only": "Gender must be male, female, or other",
                "any.required": "Gender is required",
            }),
        email: Joi.string()
            .trim()
            .email()
            .lowercase()
            .required()
            .messages({
                "string.email": "Please enter a valid email address",
                "any.required": "Email is required",
            }),
    }),
};

const displayAllApplySkaterQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
    }),
};

export {
    createClubValidation,
    editClubValidation,
    clubFormulaSourceValidation,
    addSkaterValidation,
    displayAllApplySkaterQueryValidation,
}