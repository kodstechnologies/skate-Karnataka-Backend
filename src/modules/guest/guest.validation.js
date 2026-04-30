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


export const addFeedBackValidation = {
  body: Joi.object({
    fullName: Joi.string().trim().min(3).max(50).required().messages({
      "string.empty": "Full name is required",
      "any.required": "Full name is required",
    }),
    email: Joi.string().trim().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Invalid phone number",
      "any.required": "Phone number is required",
    }),
    message: Joi.string().trim().min(5).max(1000).required().messages({
      "string.empty": "Message is required",
      "any.required": "Message is required",
    }),
  })
};

export const addNewsValidation = {
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).required().messages({
      "string.empty": "Heading is required",
      "any.required": "Heading is required",
    }),
    about: Joi.string().trim().min(5).max(2000).required().messages({
      "string.empty": "About is required",
      "any.required": "About is required",
    }),
  }),
};

export const updateNewsValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "News id is required",
      "string.empty": "News id is required",
    }),
  }),
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).optional(),
    about: Joi.string().trim().min(5).max(2000).optional(),
  }).min(1),
};

export const newsByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "News id is required",
      "string.empty": "News id is required",
    }),
  }),
};

export const eventByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Event id is required",
      "string.empty": "Event id is required",
    }),
  }),
};