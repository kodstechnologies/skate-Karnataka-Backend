import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import {
    uploadTemplate,
    updateTemplate,
    setActiveTemplate,
    getAllTemplates,
    getTemplate,
    getTemplateById,
    generateCertificate,
} from "./certificate.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/v1/all", authenticate(["Skater"]), (_req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, [], "Dummy certificate list"));
});

router.post("/v1/template", authenticate(["Admin"]), upload.single("pdf"), uploadTemplate);
router.put("/v1/template/:id", authenticate(["Admin"]), upload.single("pdf"), updateTemplate);
router.patch("/v1/template/:id/activate", authenticate(["Admin"]), setActiveTemplate);
router.get("/v1/templates", authenticate(["Admin"]), getAllTemplates);
router.get("/v1/template/:id", authenticate(["Admin"]), getTemplateById);
router.get("/v1/template", authenticate(["Admin"]), getTemplate);

// ── Certificate generation & download ───────────────────────────────────────
router.post("/v1/generate", generateCertificate);

export default router;