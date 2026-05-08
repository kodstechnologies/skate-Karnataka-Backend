import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    create_template_service,
    update_template_service,
    set_active_template_service,
    get_all_templates_service,
    get_template_service,
    get_template_by_id_service,
    generate_certificate_service,
} from "./certificate.service.js";
import {
    uploadTemplateValidation,
    updateTemplateValidation,
    generateCertificateValidation,
} from "./certificate.validation.js";

// ---------------------------------------------------------------------------
// MAX file size constant
// ---------------------------------------------------------------------------
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// uploadTemplate — CREATE a new template
// Requires: name (body), layout (body, JSON string), pdf (file, optional)
// ---------------------------------------------------------------------------
const uploadTemplate = asyncHandler(async (req, res) => {
    const file = req.file;

    const { error, value } = uploadTemplateValidation.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
        throw new AppError(message, 400);
    }

    const { name, layout: layoutString } = value;

    let layout;
    try {
        layout = JSON.parse(layoutString);
    } catch {
        throw new AppError("layout must be valid JSON", 400);
    }

    if (file) {
        if (file.mimetype !== "application/pdf") {
            throw new AppError("Uploaded template must be a PDF file", 400);
        }
        if (file.size > MAX_PDF_SIZE_BYTES) {
            throw new AppError("PDF template must be smaller than 10 MB", 400);
        }
    }

    const result = await create_template_service(name, file, layout);
    return res.status(201).json(new ApiResponse(201, result, "Template created successfully"));
});

// ---------------------------------------------------------------------------
// updateTemplate — UPDATE an existing template by _id
// Requires: layout (body, JSON string). name + pdf are optional.
// ---------------------------------------------------------------------------
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    const { error, value } = updateTemplateValidation.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
        throw new AppError(message, 400);
    }

    const { name, layout: layoutString } = value;

    let layout;
    try {
        layout = JSON.parse(layoutString);
    } catch {
        throw new AppError("layout must be valid JSON", 400);
    }

    if (file) {
        if (file.mimetype !== "application/pdf") {
            throw new AppError("Uploaded template must be a PDF file", 400);
        }
        if (file.size > MAX_PDF_SIZE_BYTES) {
            throw new AppError("PDF template must be smaller than 10 MB", 400);
        }
    }

    const result = await update_template_service(id, file, { name, layout });
    return res.status(200).json(new ApiResponse(200, result, "Template updated successfully"));
});

// ---------------------------------------------------------------------------
// setActiveTemplate — mark one template as the active one for generation
// ---------------------------------------------------------------------------
const setActiveTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await set_active_template_service(id);
    return res.status(200).json(new ApiResponse(200, result, "Template set as active successfully"));
});

// ---------------------------------------------------------------------------
// getAllTemplates — return lightweight list for the dropdown
// ---------------------------------------------------------------------------
const getAllTemplates = asyncHandler(async (req, res) => {
    const templates = await get_all_templates_service();
    return res.status(200).json(new ApiResponse(200, templates, "Templates retrieved successfully"));
});

// ---------------------------------------------------------------------------
// getTemplate — return the single active template (unchanged contract)
// ---------------------------------------------------------------------------
const getTemplate = asyncHandler(async (req, res) => {
    const template = await get_template_service();
    return res.status(200).json(new ApiResponse(200, template, "Template retrieved successfully"));
});

// ---------------------------------------------------------------------------
// getTemplateById — return full template data by _id (for edit modal)
// ---------------------------------------------------------------------------
const getTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await get_template_by_id_service(id);
    return res.status(200).json(new ApiResponse(200, template, "Template retrieved successfully"));
});

// ---------------------------------------------------------------------------
// generateCertificate — UNCHANGED logic; only imports differ above
// ---------------------------------------------------------------------------
const generateCertificate = asyncHandler(async (req, res) => {
    const { error, value } = generateCertificateValidation.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const message = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
        throw new AppError(message, 400);
    }

    const { name, issueDate, ageGroup, clubName, winnerKRSAId } = value;
    console.log(value)
    const result = await generate_certificate_service({ name, issueDate, ageGroup, clubName, winnerKRSAId });
    return res.status(200).json(new ApiResponse(200, result, "Certificate generated successfully"));
});

export {
    uploadTemplate,
    updateTemplate,
    setActiveTemplate,
    getAllTemplates,
    getTemplate,
    getTemplateById,
    generateCertificate,
};
