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

const uploadTemplate = asyncHandler(async (req, res) => {
  const layout = req.body.layout;
  const file = req.file;
  if (!layout) throw new AppError(400, "Layout is required");
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
  const { name, issueDate, field, clubName, Rank, winnerKRSAId } = req.body;
  // const{id}=req.user
  if (!name || !issueDate || !field || !clubName || !Rank || !winnerKRSAId) {
    throw new AppError(400, "Missing required dynamic fields for certificate");
  }
  console.log("Received data for certificate generation Controller");
  const result = await generate_certificate_service({name, issueDate, field, clubName, Rank, winnerKRSAId });
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
    throw new AppError(500, "Failed to download the certificate from storage");
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
