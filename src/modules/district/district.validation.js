import Joi from "joi";

const createDistrictValidation = {
  body: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        "string.empty": "District name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 50 characters",
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
  }),
};

export {
  createDistrictValidation,
  editDistrictValidation,
};