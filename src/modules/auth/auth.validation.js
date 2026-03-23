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
      .trim()
      .required()
      .messages({
        "string.empty": "District is required",
        "any.required": "District is required",
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

    role: Joi.string()
      .valid("skater", "parent", "school", "academy", "officials", "guest", "admin")
      .default("guest")
      .messages({
        "any.only":
          "Role must be one of: skater, parent, school, academy, officials, guest, admin",
      }),
  }),
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