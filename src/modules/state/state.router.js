import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import {
  createNewState,
  deleteState,
  displayAllClubsByState,
  displayAllDistrictsByState,
  displayAllSkatersByState,
  displaySkaterById,
  displayClubById,
  displayClubSkaters,
  displayClubSkaterById,
  displayAllState,
  displayDashboard,
  displayProfile,
  stateAccountProfile,
  editStateAccountProfile,
  displaySingleStateAllDistricts,
  updateState,
} from "./state.controller.js";
import {
  createStateValidation,
  editStateValidation,
  stateSelfEditProfileValidation,
  getAllStateValidation,
  stateListQueryValidation,
} from "./state.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { authenticate, ensureStateAdminOrOwnClub } from "../../middleware/auth.middleware.js";
import { displayDistrictClubDetails, displayDistrictClubs, displayDistrictDetails, displayDistrictEvents, displayDistricts, displayDistrictSkaters } from "../guest/guest.controller.js";
import { displayApplications } from "../event/event.controller.js";

const router = express.Router();


// ======================== total district =================

router.get(
  "/v1/district",
  authenticate(["Admin", "State"]),
  displayDistricts
);
router.get(
  "/v1/district/:districtId",
  authenticate(["Admin", "State"]),
  displayDistrictDetails
);

router.get(
  "/v1/district/:districtId/club",
authenticate(["Admin", "State"]),
  displayDistrictClubs
);
router.get(
  "/v1/district/:districtId/club/:clubId",
  authenticate(["Admin", "State"]),
  displayDistrictClubDetails
);
router.get(
  "/v1/district/:districtId/skater",
  authenticate(["Admin", "State"]),
  displayDistrictSkaters
);
router.get(
  "/v1/district/:districtId/skater/:id",
  authenticate(["Admin", "State"]),
  displaySkaterById
);
router.get(
  "/v1/district/:districtId/event",
  authenticate(["Admin", "State"]),
  displayDistrictEvents
);


// ======================== total club =================

router.get(
  "/v1/club",
  authenticate(["Admin", "State"]),
  validate(stateListQueryValidation),
  displayAllClubsByState
);
router.get(
  "/v1/club/:clubId",
  authenticate(["Admin", "State"]),
  displayClubById
);

router.get(
  "/v1/club/:clubId/skater",
  authenticate(["Admin", "State", "Club"]),
  ensureStateAdminOrOwnClub("clubId"),
  validate(stateListQueryValidation),
  displayClubSkaters
);

router.get(
  "/v1/club/:clubId/skater/:skaterId",
  authenticate(["Admin", "State", "Club"]),
  ensureStateAdminOrOwnClub("clubId"),
  displayClubSkaterById
);

// ======================== total skater =================
// Must stay above GET /v1/:id so /v1/skater is not matched as id = "skater".

router.get(
  "/v1/skater",
  authenticate(["Admin", "State"]),
  validate(stateListQueryValidation),
  displayAllSkatersByState
);
router.get(
  "/v1/skater/:skaterId",
  authenticate(["Admin", "State"]),
  displaySkaterById
);

// ==================

router.get("/v1/dashboard",
  authenticate(["Admin","State"]),
  displayDashboard
)

router.get("/v1/profile",
  authenticate(["State"]),
  displayProfile
)

router.get(
  "/v1/account-profile",
  authenticate(["State"]),
  stateAccountProfile
);

router.patch(
  "/v1/edit-profile",
  authenticate(["State"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(stateSelfEditProfileValidation),
  editStateAccountProfile
);

// 🔹 Get all states
router.get("/v1/all",
  authenticate(["Admin", "State"]),
  validate(getAllStateValidation),
  displayAllState
);

// 🔹 Create new state
router.post("/v1/",
  upload.single("img"),
  uploadToS3("img"),
  authenticate(["Admin"]),
  validate(createStateValidation),
  createNewState
);

router.get(
  "/v1/all-district",
  authenticate(["State", "Admin"]),
  validate(stateListQueryValidation),
  displayAllDistrictsByState
);
router.get(
  "/v1/all-clubs",
  authenticate(["State", "Admin"]),
  validate(stateListQueryValidation),
  displayAllClubsByState
);
router.get(
  "/v1/all-skater",
  authenticate(["State", "Admin"]),
  validate(stateListQueryValidation),
  displayAllSkatersByState
);

// ======================== display application =================
// Must stay above GET /v1/:id so /v1/display-applications is not matched as id.

router.get(
  "/v1/display-applications",
  authenticate(["Admin", "State"]),
  validate(stateListQueryValidation),
  displayApplications
);

// 🔹 Get single state + all districts inside it
router.get("/v1/:id",
  authenticate(["Admin", "State"]),
  displaySingleStateAllDistricts
);

// 🔹 Update state
router.patch("/v1/:id",
  upload.single("img"),
  uploadToS3("img"),
  authenticate(["Admin"]),
  validate(editStateValidation),
  updateState
);

// 🔹 Delete state
router.delete("/v1/:id",
  authenticate(["Admin"]),
  deleteState
);


export default router;