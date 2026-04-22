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