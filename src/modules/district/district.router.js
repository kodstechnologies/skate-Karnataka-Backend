import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import {
    createDistrictValidation,
    districtFormulaSourceValidation,
    districtPendingApprovalsQueryValidation,
    editDistrictValidation,
} from "./district.validation.js";
import {
    create_formula_validation,
    update_formula_validation,
} from "../event/event.validation.js";
import {
    createDistrictFormulaHandler,
    deleteDistrictFormulaHandler,
    getDistrictFormulaById,
    getDistrictFormulaOptions,
    getDistrictFormulaSourceSetting,
    getDistrictFormulas,
    patchDistrictFormulaSourceSetting,
    updateDistrictFormulaHandler,
} from "./district.formula.controller.js";
import { acceptClub, createNewDistrict, deleteDistrict, displayAllApply, displayApplyAllClub, displayAllDistrict, displayDistrictClubSkaters, displayDistrictDashboard, displayDistrictProfile, displaySingleDistrictAllClubs, displaySingleDistrictMembers, displaySkaterDetails, displayTotalClubs, displayTotalSkater, districtClubDetails, districtUnLinkClub, leaveClub, rejectClub, rejectLeaveClub, updateDistrict } from "./district.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router()

const normalizeFormBody = (req, _res, next) => {
  if (!req.body || typeof req.body !== "object") {
    return next();
  }

  req.body = Object.fromEntries(
    Object.entries(req.body).map(([key, value]) => [
      key.trim(),
      typeof value === "string" ? value.trim() : value,
    ])
  );

  next();
};

// router.get("/v1/display-apply-all-club", authenticate(["District"]), displayApplyAllClub);

router.get("/v1/club-details/:id" , authenticate(["District"]) , districtClubDetails);
router.get("/v1/club-skaters/:id", authenticate(["District"]), displayDistrictClubSkaters);

router.get("/v1/unlink-club/:id" , authenticate(["District"]) , districtUnLinkClub);

router.get("/v1/profile", authenticate(["District"]) ,displayDistrictProfile);
router.get("/v1/dashboard",authenticate(["District"]) ,displayDistrictDashboard);

router.get("/v1/formula", authenticate(["District"]), getDistrictFormulas);
router.get("/v1/formula/options", authenticate(["District"]), getDistrictFormulaOptions);
router.get(
    "/v1/formula/source",
    authenticate(["District"]),
    getDistrictFormulaSourceSetting
);
router.patch(
    "/v1/formula/source",
    authenticate(["District"]),
    validate(districtFormulaSourceValidation),
    patchDistrictFormulaSourceSetting
);
router.get("/v1/formula/:id", authenticate(["District"]), getDistrictFormulaById);
router.post(
    "/v1/formula",
    authenticate(["District"]),
    validate(create_formula_validation),
    createDistrictFormulaHandler
);
router.patch(
    "/v1/formula/:id",
    authenticate(["District"]),
    validate(update_formula_validation),
    updateDistrictFormulaHandler
);
router.delete("/v1/formula/:id", authenticate(["District"]), deleteDistrictFormulaHandler);

// router.get())
router.get("/v1/total-club",authenticate(["District"]) ,displayTotalClubs);
router.get("/v1/total-skater",authenticate(["District"]) ,displayTotalSkater);
router.get("/v1/skater/:id",authenticate(["District"]) ,displaySkaterDetails);


router.get(
  "/v1/pending-approvals",
  authenticate(["District"]),
  validate(districtPendingApprovalsQueryValidation),
  displayApplyAllClub
);
router.get("/v1/accept-join-club/:id", authenticate(["District"]), acceptClub);
router.get("/v1/reject-join-club/:id", authenticate(["District"]), rejectClub);
router.get("/v1/accept-leave-club/:id", authenticate(["District"]), leaveClub);
router.get("/v1/reject-leave-club/:id", authenticate(["District"]), rejectLeaveClub);

router.get("/v1/single-district/:id", displaySingleDistrictMembers);
router.get("/v1/all",
    displayAllDistrict);
router.post("/v1/",
        upload.single("img"),
        uploadToS3("districts"),
    normalizeFormBody,
    validate(createDistrictValidation),
    createNewDistrict);
router.get("/v1/:id",
    displaySingleDistrictAllClubs);
router.patch("/v1/:id",
    upload.single("img"),
    uploadToS3("districts"),
    normalizeFormBody,
    validate(editDistrictValidation),
    updateDistrict);
router.delete("/v1/:id",
    deleteDistrict);

export default router;