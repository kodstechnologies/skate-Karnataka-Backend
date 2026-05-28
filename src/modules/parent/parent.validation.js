import Joi from "joi";

const indianPhoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^\S+@\S+\.\S+$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const skaterFieldRegex = /^skaters\[(?:\d*)\]\[(fullName|phone|email|gender|dob|bloodGroup|school|grade|club|district|discipline|category|aadharNumber|photo|documents)\]$/;

export const afterLoginParentFormValidation = {
  params: Joi.object({
    id: Joi.string().trim().pattern(objectIdRegex).required().messages({
      "any.required": "Parent id is required",
      "string.empty": "Parent id is required",
      "string.pattern.base": "Invalid parent id format",
    }),
  }),
  body: Joi.object({
    fullName: Joi.string().trim().min(2).max(50),
    phone: Joi.string().trim().pattern(indianPhoneRegex).messages({
      "string.pattern.base": "Parent phone must be a valid 10-digit Indian number",
    }),
    email: Joi.string().trim().lowercase().pattern(emailRegex).messages({
      "string.pattern.base": "Invalid parent email format",
    }),
    gender: Joi.string().trim().lowercase().valid("male", "female", "other"),
    address: Joi.string().trim().max(200),
    district: Joi.string().trim().pattern(objectIdRegex).messages({
      "string.pattern.base": "Invalid district id format",
    }),
  })
    // Accept multipart keys like skaters[0][email], skaters[1][phone], etc.
    .pattern(
      skaterFieldRegex,
      Joi.alternatives().try(Joi.string().allow(""), Joi.number(), Joi.boolean(), Joi.any())
    )
    // Required so multipart dynamic keys are not stripped before min(1) check.
    .unknown(true)
    .min(1).messages({
    "object.min": "At least one field is required to update parent form",
  }),
};
