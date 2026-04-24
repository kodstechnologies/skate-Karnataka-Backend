import Joi from "joi";

export const createStateValidation = {
  body: Joi.object({
    fullName: Joi.string().trim().min(3).max(50).required(),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required(),
    address: Joi.string().trim().max(200).optional().allow(""),
    gender: Joi.string().trim().lowercase().optional().allow(""),
    email: Joi.string().trim().email().lowercase().optional().allow(""),
    img: Joi.string().uri().optional().allow(""),
    about: Joi.string().trim().max(500).optional().allow(""),
    stateu: Joi.string().trim().max(500).optional().allow(""),
    allowedModule: Joi.string().trim().max(500).optional().allow(""),
  }),
};

export const editStateValidation = {
  body: Joi.object({
    fullName: Joi.string().trim().min(3).max(50).optional(),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional(),
    address: Joi.string().trim().max(200).optional().allow(""),
    gender: Joi.string().trim().lowercase().optional().allow(""),
    email: Joi.string().trim().email().lowercase().optional().allow(""),
    img: Joi.string().uri().optional().allow(""),
    about: Joi.string().trim().max(500).optional().allow(""),
    stateu: Joi.string().trim().max(500).optional().allow(""),
    allowedModule: Joi.string().trim().max(500).optional().allow(""),
  }).min(1),
};

export const getAllStateValidation = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
