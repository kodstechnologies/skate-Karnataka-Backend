import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    uploadTemplate,
    updateTemplate,
    setActiveTemplate,
    deleteTemplate,
    getAllTemplates,
    getTemplate,
    getTemplateById,
    getSkaterCertificateRows,
    generateCertificate,
    generateEventCertificates,
} from "./certificate.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/v1/all", authenticate(["Skater"]), getSkaterCertificateRows);

router.post("/v1/template", authenticate(["Admin"]), upload.single("pdf"), uploadTemplate);
router.put("/v1/template/:id", authenticate(["Admin"]), upload.single("pdf"), updateTemplate);
router.patch("/v1/template/:id/activate", authenticate(["Admin"]), setActiveTemplate);
router.delete("/v1/template/:id", authenticate(["Admin"]), deleteTemplate);
router.get("/v1/templates", authenticate(["Admin"]), getAllTemplates);
router.get("/v1/template/:id", authenticate(["Admin"]), getTemplateById);
router.get("/v1/template", authenticate(["Admin"]), getTemplate);

router.get(
    "/v1/generateCertificate/:id",
    authenticate(["Admin"]),
    generateEventCertificates
);

// ── Certificate generation & download ───────────────────────────────────────
router.post("/v1/generate", generateCertificate);

export default router;