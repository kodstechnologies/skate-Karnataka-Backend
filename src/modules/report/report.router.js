import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { createReport, getClubReports, getDistrictReports, getSkaterReports, getStateReports, updateStatus } from "./report.controller.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { create_report_validation } from "./report.validation.js";

const router = express.Router()

// ============= skater related ==========================
router.post("/v1", authenticate(["Skater"]), validateMultiple(create_report_validation), createReport);
router.get("/v1/skater-reports", authenticate(["Skater"]), getSkaterReports);
router.patch("/v1/:id", authenticate(["Skater"]), updateStatus);

// ==============================
router.get("/v1/club", authenticate(["Club"]), getClubReports);
router.get("/v1/district", authenticate(["District"]), getDistrictReports);
router.get("/v1/state", authenticate(["State"]), getStateReports);

// router.patch("/:" , edit_report);
// router.delete("/:id", delete_report);

export default router;