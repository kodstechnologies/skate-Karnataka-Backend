import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createReport, getClubReports, getDistrictReports, getSkaterReports, getStateReports, inProgressClubReports, resolveClubReports, resolveDistrictReports, resolveStateReports, updateStatus } from "./report.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { create_report_validation } from "./report.validation.js";

const router = express.Router()

// ============= skater related ==========================
router.post("/v1", authenticate(["Skater"]), validate(create_report_validation), createReport);
router.get("/v1/skater-reports", authenticate(["Skater"]), getSkaterReports);
router.patch("/v1/:id", authenticate(["Skater"]), updateStatus);

// ==============================
router.get("/v1/club", authenticate(["Club"]), getClubReports);
router.get("/v1/club-inprogress/:id", authenticate(["Club"]), inProgressClubReports);
router.get("/v1/club-resolved/:id", authenticate(["Club"]), resolveClubReports);


router.get("/v1/district", authenticate(["District"]), getDistrictReports);
router.get("/v1/district-resolved/:id", authenticate(["District"]), resolveDistrictReports);

router.get("/v1/state", authenticate(["State","Admin"]), getStateReports);
router.get("/v1/state-resolved/:id", authenticate(["State","Admin"]), resolveStateReports);


// router.patch("/:" , edit_report);
// router.delete("/:id", delete_report);

export default router;