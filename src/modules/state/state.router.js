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
  displaySingleStateAllDistricts,
  updateState,
} from "./state.controller.js";
import {
  createStateValidation,
  editStateValidation,
  getAllStateValidation,
  stateListQueryValidation,
} from "./state.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { authenticate, ensureStateAdminOrOwnClub } from "../../middleware/auth.middleware.js";
import { displayDistrictClubDetails, displayDistrictClubs, displayDistrictDetails, displayDistrictEvents, displayDistricts, displayDistrictSkaters } from "../guest/guest.controller.js";
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




// ==================

router.get("/v1/dashboard",
  authenticate(["State"]),
  displayDashboard
)

router.get("/v1/profile",
  authenticate(["State"]),
  displayProfile
)

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

// ======================== total club =================

// ======================== total skater =================




// ======================== total skater =================
// ======================== total skater =================
// ======================== total skater =================
// ======================== total skater =================
// ======================== total skater =================


export default router;