import Joi from "joi";

const createDistrictValidation = {
  body: Joi.object({
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