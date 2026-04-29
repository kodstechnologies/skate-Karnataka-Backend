import Joi from "joi";

export const afterLoginParentFormValidation = {

}

export const addContactUSValidation = {
  body: Joi.object({
    email: Joi.string()
      .trim()
      .email()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
        "any.required": "Email is required"
      }),

    phone: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Invalid phone number",
        "any.required": "Phone number is required"
      })

  }),
};
