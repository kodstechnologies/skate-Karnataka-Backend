import Joi from "joi";

const createCertificateValidation = {
  body: Joi.object({
    winnerKRSAId: Joi.string().required(),
  }),
};

// ---------------------------------------------------------------------------
// generateCertificate — validates all dynamic fields sent in req.body
// ---------------------------------------------------------------------------
const generateCertificateValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "name must be a string",
      "string.min": "name must be at least 2 characters",
      "string.max": "name must be at most 100 characters",
      "any.required": "name is required",
    }),

    issueDate: Joi.string().trim().min(1).max(100).required().messages({
      "string.base": "issueDate must be a string",
      "string.min": "issueDate must not be empty",
      "any.required": "issueDate is required",
    }),

    ageGroup: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "ageGroup must be a string",
      "string.min": "ageGroup must be at least 2 characters",
      "string.max": "ageGroup must be at most 100 characters",
      "any.required": "ageGroup is required",
    }),

    clubName: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "clubName must be a string",
      "string.min": "clubName must be at least 2 characters",
      "string.max": "clubName must be at most 100 characters",
      "any.required": "clubName is required",
    }),



    // KRSA ID is a custom alphanumeric string e.g. "KRSA123456S"
    winnerKRSAId: Joi.string().trim().min(5).max(30).required().messages({
      "string.base": "winnerKRSAId must be a string",
      "string.min": "winnerKRSAId must be at least 5 characters",
      "string.max": "winnerKRSAId must be at most 30 characters",
      "any.required": "winnerKRSAId is required",
    }),
  }),
};

// ---------------------------------------------------------------------------
// uploadTemplate (CREATE) — requires `name` + `layout` JSON string.
// File type/size is checked in the controller after multer runs.
// ---------------------------------------------------------------------------
const uploadTemplateValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "name must be a string",
      "string.min": "name must be at least 2 characters",
      "string.max": "name must be at most 100 characters",
      "any.required": "Template name is required",
    }),
    layout: Joi.string().required().messages({
      "string.base": "layout must be a JSON string",
      "any.required": "layout is required",
    }),
  }),
};

// ---------------------------------------------------------------------------
// updateTemplate (UPDATE) — `name` is optional; `layout` is required.
// ---------------------------------------------------------------------------
const updateTemplateValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
      "string.base": "name must be a string",
      "string.min": "name must be at least 2 characters",
      "string.max": "name must be at most 100 characters",
    }),
    layout: Joi.string().required().messages({
      "string.base": "layout must be a JSON string",
      "any.required": "layout is required",
    }),
  }),
};

export {
  createCertificateValidation,
  generateCertificateValidation,
  uploadTemplateValidation,
  updateTemplateValidation,
};