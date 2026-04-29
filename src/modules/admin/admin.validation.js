import Joi from "joi";

export const adminLoginValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(4).required().messages({
      "string.min": "Password must be at least 4 characters",
      "any.required": "Password is required",
    }),
  }),
};

export const adminForgotPasswordValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
  }),
};

export const adminSendOtpForPasswordValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
  }),
};

export const adminVerifyOtpForPasswordValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
    otp: Joi.string().length(4).required().messages({
      "string.length": "OTP must be exactly 4 digits",
      "any.required": "OTP is required",
    }),
  }),
};

export const adminResetPasswordValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
    newPassword: Joi.string().min(4).required().messages({
      "string.min": "New password must be at least 4 characters",
      "any.required": "New password is required",
    }),
    confirmPassword: Joi.string().required().valid(Joi.ref("newPassword")).messages({
      "any.only": "Confirm password must match new password",
      "any.required": "Confirm password is required",
    }),
  }),
};

export const adminEditProfileValidation = {
  body: Joi.object({
    fullName: Joi.string().trim().min(3).max(50),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/),
    email: Joi.string().trim().email().lowercase(),
    gender: Joi.string().trim().lowercase(),
    address: Joi.string().trim().max(200).allow(""),
    img: Joi.string().uri(),
  }).min(1),
};

export const createDistrictByAdminValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "any.required": "District name is required",
      "string.empty": "District name is required",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
    }),
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "District image must be a valid URL",
    }),
    about: Joi.string().trim().max(500).allow("").optional().messages({
      "string.max": "About cannot exceed 500 characters",
    }),
  }),
};

export const updateDistrictByAdminValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "District image must be a valid URL",
    }),
    about: Joi.string().trim().max(500).allow("").optional().messages({
      "string.max": "About cannot exceed 500 characters",
    }),
  }).min(1),
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "District id is required",
      "string.empty": "District id is required",
    }),
  }),
};

export const districtByAdminIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "District id is required",
      "string.empty": "District id is required",
    }),
  }),
};