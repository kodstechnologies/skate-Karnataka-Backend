import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  uploadTemplate,
  getTemplate,
  generateCertificate,
  downloadCertificate,
  displayAllCertificate,
} from "./certificate.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Validation is handled inside each controller via Joi schemas.
router.post("/v1/template", authenticate(["Admin"]), upload.single("pdf"), uploadTemplate);
router.get("/v1/template", authenticate(["Admin"]), getTemplate);
router.post("/v1/generate", generateCertificate);
router.get("/v1/download/:id", authenticate(["Admin", "Skater"]), downloadCertificate);
router.get("/v1/certificates", authenticate(["Admin", "Skater"]), displayAllCertificate);

// router.get("/v1/all", authenticate(["Skater"]), displayAllCertificate);
// router.patch("/v1/request/:id", authenticate(["Skater"]), applyRequest);
// router.post("/v1", createCertificate);
// router.patch("/v1/:id", updateCertificates);
// router.delete("/v1/:id", deleteCertificates);
// router.get("/v1/:id", displaySingleCertificate);

export default router;