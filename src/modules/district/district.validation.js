import Joi from "joi";

const createDistrictValidation = {
  body: Joi.object({
    fullName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages({
        "any.required": "Full name is required",
        "string.min": "Minimum 3 characters",
        "string.max": "Maximum 50 characters",
      }),
    phone: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "any.required": "Phone is required",
        "string.pattern.base": "Invalid Indian phone number",
      }),
    address: Joi.string()
      .trim()
      .max(200)
      .optional()
      .allow(""),
    gender: Joi.string()
      .trim()
      .lowercase()
      .optional()
      .allow(""),
    countryCode: Joi.string()
      .trim()
      .optional()
      .allow(""),
    email: Joi.string()
      .trim()
      .email()
      .lowercase()
      .optional()
      .allow("")
      .messages({
        "string.email": "Invalid email",
      }),
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        "any.required": "District name is required",
        "string.empty": "District name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 50 characters",
      }),
    img: Joi.string()
      .uri()
      .optional()
      .allow("")
      .messages({
        "string.uri": "District image must be a valid URL",
      }),
    about: Joi.string()
      .trim()
      .max(500)
      .optional()
      .allow("")
      .messages({
        "string.max": "About cannot exceed 500 characters",
      }),
  }),
};

const editDistrictValidation = {
  body: Joi.object({
    fullName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .optional(),
    phone: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .optional(),
    address: Joi.string()
      .trim()
      .max(200)
      .optional()
      .allow(""),
    gender: Joi.string()
      .trim()
      .lowercase()
      .optional()
      .allow(""),
    countryCode: Joi.string()
      .trim()
      .optional()
      .allow(""),
    email: Joi.string()
      .trim()
      .email()
      .lowercase()
      .optional()
      .allow(""),
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    img: Joi.string()
      .uri()
      .optional()
      .allow("")
      .messages({
        "string.uri": "District image must be a valid URL",
      }),
    about: Joi.string()
      .trim()
      .max(500)
      .optional()
      .allow("")
      .messages({
        "string.max": "About cannot exceed 500 characters",
      }),
  }).min(1),
};

export {
  createDistrictValidation,
  editDistrictValidation,
};