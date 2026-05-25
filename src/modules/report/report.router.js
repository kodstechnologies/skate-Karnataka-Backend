import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createReport, getClubReports, getDistrictReports, getSkaterReports, getStateReports, updateClubReport, updateDistrictReport, updateStateReport, updateStatus } from "./report.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { create_report_validation, state_reports_list_validation, update_club_report_validation, update_district_report_validation, update_skater_status_validation, update_state_report_validation } from "./report.validation.js";

const router = express.Router()

// ============= skater related ==========================
router.post("/v1", authenticate(["Skater"]), validate(create_report_validation), createReport);
router.get("/v1/skater-reports", authenticate(["Skater"]), getSkaterReports);
router.patch("/v1/:id", authenticate(["Skater"]), validate(update_skater_status_validation), updateStatus);

// ============================== club related ==========================
router.get("/v1/club", authenticate(["Club", "Skater"]), getClubReports);
router.patch(
    "/v1/club/:id",
    authenticate(["Club"]),
    validate(update_club_report_validation),
    updateClubReport
);


// ========================= district related =========================
router.get("/v1/district", authenticate(["District"]), getDistrictReports);
router.patch(
    "/v1/district/:id",
    authenticate(["District"]),
    validate(update_district_report_validation),
    updateDistrictReport
);
// ===================== state related =========================

router.get(
    "/v1/state",
    authenticate(["State", "Admin"]),
    validate(state_reports_list_validation),
    getStateReports
);
router.patch(
    "/v1/state/:id",
    authenticate(["State", "Admin"]),
    validate(update_state_report_validation),
    updateStateReport
);

// router.patch("/:" , edit_report);
// router.delete("/:id", delete_report);

export default router;