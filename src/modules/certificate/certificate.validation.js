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

    field: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "field must be a string",
      "string.min": "field must be at least 2 characters",
      "string.max": "field must be at most 100 characters",
      "any.required": "field is required",
    }),

    clubName: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "clubName must be a string",
      "string.min": "clubName must be at least 2 characters",
      "string.max": "clubName must be at most 100 characters",
      "any.required": "clubName is required",
    }),

    // Kept flexible: Rank can be "1st" / "Gold" (string) or 1 / 2 (number)
    Rank: Joi.alternatives()
      .try(Joi.string().trim().min(1).max(50), Joi.number().integer().min(1))
      .required()
      .messages({
        "alternatives.match": "Rank must be a non-empty string or positive integer",
        "any.required": "Rank is required",
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
// uploadTemplate — validates req.body (layout arrives as a JSON string)
// File type / size is checked structurally in the controller after multer runs.
// ---------------------------------------------------------------------------
const uploadTemplateValidation = {
  body: Joi.object({
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
};