import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    uploadTemplate,
    updateTemplate,
    setActiveTemplate,
    getAllTemplates,
    getTemplate,
    getTemplateById,
    generateCertificate,
    downloadCertificate,
    displayAllCertificate,
} from "./certificate.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// ── Template CRUD ────────────────────────────────────────────────────────────
// POST   /certificate/v1/template          → create a new template  [Admin]
// PUT    /certificate/v1/template/:id      → update template by id  [Admin]
// PATCH  /certificate/v1/template/:id/activate → set as active      [Admin]
// GET    /certificate/v1/template          → get active template     [Admin]
// GET    /certificate/v1/template/:id      → get template by id      [Admin]
// GET    /certificate/v1/templates         → list all templates      [Admin]
router.post("/v1/template", authenticate(["Admin"]), upload.single("pdf"), uploadTemplate);
router.put("/v1/template/:id", authenticate(["Admin"]), upload.single("pdf"), updateTemplate);
router.patch("/v1/template/:id/activate", authenticate(["Admin"]), setActiveTemplate);
router.get("/v1/templates", authenticate(["Admin"]), getAllTemplates);
router.get("/v1/template/:id", authenticate(["Admin"]), getTemplateById);
router.get("/v1/template", authenticate(["Admin"]), getTemplate);

// ── Certificate generation & download ───────────────────────────────────────
router.post("/v1/generate", generateCertificate);
router.get("/v1/download/:id", authenticate(["Admin", "Skater"]), downloadCertificate);
router.get("/v1/certificates", authenticate(["Admin", "Skater"]), displayAllCertificate);

export default router;