import Joi from "joi";
import mongoose from "mongoose";

/**
 * REGISTER VALIDATION
 */
const RegisterValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.empty": "Name is required",
                "string.min": "Name must be at least 3 characters",
            }),

        dob: Joi.date()
            .iso()
            .required()
            .messages({
                "date.base": "DOB must be a valid date",
                "any.required": "DOB is required"
            }),

        district: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty": "District is required"
            }),

        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        phone: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone must be 10 digits",
                "any.required": "Phone is required"
            }),

        role: Joi.string()
            .valid("user", "admin")
            .required()
            .messages({
                "any.only": "Role must be user or admin"
            })
    })
};

/**
 * LOGIN VALIDATION
 */
const LoginValidation = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        role: Joi.string()
            .valid("user", "admin")
            .required()
            .messages({
                "any.only": "Role must be user or admin"
            })
    })
};

/**
 * VERIFY OTP VALIDATION
 */

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
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 6 digits",
                "any.required": "OTP is required"
            }),

        firebaseToken: Joi.string().allow("").optional()
    })
};



const LogoutValidation = {
    body: Joi.object({
        refreshTokens: Joi.string().required(),
        firebaseToken: Joi.string().optional()
    })
};

/**
 * REFRESH TOKEN VALIDATION
 */
const RefreshTokenValidation = {
    body: Joi.object({
        refreshToken: Joi.string().required()
    })
};

/**
 * UPDATE PROFILE VALIDATION
 */
const UpdateProfileValidation = {
    body: Joi.object({
        fullName: Joi.string().min(3).max(50).optional(),
        dob: Joi.date().iso().optional(),
        district: Joi.string().optional(),
        email: Joi.string().email().optional(),
        photo: Joi.string().optional()
    })
};

export {
    RegisterValidation,
    LoginValidation,
    VerifyOTPValidation,
    LogoutValidation,
    RefreshTokenValidation,
    UpdateProfileValidation
}