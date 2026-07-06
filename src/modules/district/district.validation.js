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
      .optional()
      .allow(""),
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
      .optional()
      .allow(""),
    formulaSource: Joi.string().valid("admin", "district", "both").optional(),
  }).min(1),
};

const districtFormulaSourceValidation = {
  body: Joi.object({
    formulaSource: Joi.string()
      .valid("admin", "district", "both")
      .required()
      .messages({
        "any.only": "formulaSource must be admin, district, or both",
      }),
  }),
};

const districtPendingApprovalsQueryValidation = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export {
  createDistrictValidation,
  editDistrictValidation,
  districtFormulaSourceValidation,
  districtPendingApprovalsQueryValidation,
};