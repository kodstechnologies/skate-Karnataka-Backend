import Joi from "joi";
import mongoose from "mongoose";

const RegisterValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 3 characters long",
                "string.max": "Full name cannot exceed 50 characters",
                "any.required": "Full name is required",
            }),

        address: Joi.string()
            .trim()
            .min(5)
            .max(200)
            .required()
            .messages({
                "string.empty": "Address is required",
                "string.min": "Address must be at least 5 characters",
                "string.max": "Address cannot exceed 200 characters",
                "any.required": "Address is required",
            }),

        district: Joi.string()
            .custom((value, helpers) => {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    return helpers.error("any.invalid");
                }
                return value;
            })
            .optional()
            .messages({
                "any.invalid": "Invalid district ID",
            }),

        districtName: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .optional(),

        club: Joi.string()
            .custom((value, helpers) => {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    return helpers.error("any.invalid");
                }
                return value;
            })
            .optional()
            .messages({
                "any.invalid": "Invalid club ID",
            }),

        gender: Joi.string()
            .valid("male", "female", "other")
            .optional()
            .messages({
                "any.only": "Gender must be male, female, or other",
            }),

        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Please enter a valid email address",
                "string.empty": "Email is required",
                "any.required": "Email is required",
            }),

        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone number must be a valid 10-digit Indian number",
                "string.empty": "Phone number is required",
                "any.required": "Phone number is required",
            }),
        club: Joi.string().optional().allow(""),
        role: Joi.string(),
        // .valid("skater", "parent", "school", "academy", "officials", "guest", "admin")
        // .default("guest")
        // .messages({
        //     "any.only":
        //         "Role must be one of: skater, parent, school, academy, officials, guest, admin",
        // }),
    }).custom((value, helpers) => {
        const isDistrictRole = String(value.role || "").toLowerCase() === "district";

        if (!isDistrictRole && !value.district) {
            return helpers.error("any.custom", {
                message: "District is required",
            });
        }

        return value;
    }).messages({
        "any.custom": "{{#message}}",
    }),
};

const sendEmailOTPValidation = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),
    }),
};

const verifyEmailOTPValidation = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        otp: Joi.string()
            .length(4) // exactly 4 characters
            .pattern(/^[0-9]+$/) // only digits
            .required()
            .messages({
                "string.length": "OTP must be exactly 4 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required"
            }),
    }),
};

const sendPhoneOTPValidation = {
    body: Joi.object({
        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/) // Indian mobile numbers
            .required()
            .messages({
                "string.pattern.base": "Phone must be a valid 10-digit Indian number",
                "any.required": "Phone number is required"
            }),
    }),
};

const verifyPhoneOTPValidation = {
    body: Joi.object({
        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone must be a valid 10-digit Indian number",
                "any.required": "Phone number is required"
            }),

        otp: Joi.string()
            .pattern(/^\d{4}$/) // exactly 4 digits
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 4 digits",
                "any.required": "OTP is required"
            }),
    }),
};

const LoginValidation = {
    body: Joi.object({
        identifier: Joi.string()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.base": "Identifier must be a string",
                "string.empty": "Identifier cannot be empty",
                "string.min": "Identifier must be at least 3 characters",
                "string.max": "Identifier must be at most 50 characters",
                "any.required": "Identifier is required"
            }),
    })
};
const VerifyOTPValidation = {
    body: Joi.object({
        userId: Joi.string()
            .custom((value, helpers) => {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    return helpers.error("any.invalid");
                }
                return value;
            })
            .required()
            .messages({
                "any.invalid": "Invalid user ID",
                "any.required": "User ID is required"
            }),

        otp: Joi.string()
            .pattern(/^[0-9]{4}$/)
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 4 digits",
                "any.required": "OTP is required"
            }),

        firebaseTokens: Joi.alternatives()
            .try(
                Joi.string().allow(""),
                Joi.array().items(Joi.string().allow(""))
            )
            .optional()
    })
};

const afterLoginGuestFormValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .min(2)
            .max(100)

            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 2 characters",
                "any.required": "Full name is required"
            }),

        address: Joi.string()
            .max(200)
            .allow("")
            .messages({
                "string.max": "Address must be less than 200 characters"
            }),

        gender: Joi.string()
            .valid("male", "female", "other")
            .messages({
                "any.only": "Gender must be male, female, or other",
                "any.required": "Gender is required"
            }),

        email: Joi.string()
            .email()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        phone: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .messages({
                "string.pattern.base": "Phone must be a 10-digit number",
                "any.required": "Phone is required"
            }),
        interestedIn: Joi.array()
            .items(Joi.string())
            .messages({
                "array.base": "InterestedIn must be an array",
            }),
    })
};

const LogoutValidation = {
    body: Joi.object({
        refreshTokens: Joi.string().required(),
        firebaseToken: Joi.string().optional()
    })
};

const RefreshTokenValidation = {
    body: Joi.object({
        refreshToken: Joi.string().required()
    })
};


export {
    RegisterValidation,
    sendEmailOTPValidation,
    verifyEmailOTPValidation,
    sendPhoneOTPValidation,
    verifyPhoneOTPValidation,
    LoginValidation,
    VerifyOTPValidation,
    afterLoginGuestFormValidation,
    LogoutValidation,
    RefreshTokenValidation,
}