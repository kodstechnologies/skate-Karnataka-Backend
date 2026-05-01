import axios from "axios";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  create_certificate_services,
  display_all_certificate_service,
  upload_template_service,
  get_template_service,
  generate_certificate_service,
  download_certificate_service,
} from "./certificate.service.js";
import {
  uploadTemplateValidation,
  generateCertificateValidation,
} from "./certificate.validation.js";

const createCertificate = asyncHandler(async (req, res) => {
  const certificate = await create_certificate_services(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "certificate created successfully"));
});

const updateCertificates = asyncHandler(async (req, res) => {});

const deleteCertificates = asyncHandler(async (req, res) => {});

const displaySingleCertificate = asyncHandler(async (req, res) => {});

const displayAllCertificate = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const id = req.user._id;

  const certificates = await display_all_certificate_service({
    id,
    page,
    limit,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, certificates, "Certificates displayed successfully"),
    );
});


const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const uploadTemplate = asyncHandler(async (req, res) => {
  const file = req.file;

  // ── Joi validation (runs here because Multer must parse the multipart
  //    body first — validate middleware cannot run before upload.single)
  const { error, value } = uploadTemplateValidation.body.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const message = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
    throw new AppError(message, 400);
  }

  const { layout: layoutString } = value;

  // Parse layout JSON string
  let layout;
  try {
    layout = JSON.parse(layoutString);
  } catch {
    throw new AppError("layout must be valid JSON", 400);
  }

  // File validation — only run when a new file is uploaded
  if (file) {
    if (file.mimetype !== "application/pdf") {
      throw new AppError("Uploaded template must be a PDF file", 400);
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new AppError("PDF template must be smaller than 10 MB", 400);
    }
  }
  const result = await upload_template_service(file, layout);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Template uploaded successfully"));
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await get_template_service();
  return res
    .status(200)
    .json(new ApiResponse(200, template, "Template retrieved successfully"));
});

const generateCertificate = asyncHandler(async (req, res) => {
  // ── Joi validation inside the controller

  const { error, value } = generateCertificateValidation.body.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const message = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
    throw new AppError(message, 400);
  }

  const { name, issueDate, field, clubName, Rank, winnerKRSAId } = value;

  const result = await generate_certificate_service({ name, issueDate, field, clubName, Rank, winnerKRSAId });
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Certificate generated successfully"));
});

const downloadCertificate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const certificate = await download_certificate_service(id);
  
  try {
    const response = await axios.get(certificate.pdfUrl, { responseType: 'stream' });
    
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.filename || 'certificate.pdf'}"`);
    res.setHeader('Content-Type', 'application/pdf');
    
    response.data.pipe(res);
  } catch (error) {
    throw new AppError("Failed to download the certificate from storage", 500);
  }
});

export {
    
  createCertificate,
  updateCertificates,
  deleteCertificates,
  displaySingleCertificate,
  displayAllCertificate,
  uploadTemplate,
  getTemplate,
  generateCertificate,
  downloadCertificate,
};
