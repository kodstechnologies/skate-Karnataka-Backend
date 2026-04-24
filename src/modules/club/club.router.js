import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import { createClubValidation, editClubValidation } from "./club.validation.js";
import { affiliatedDistrict, apply_club, apply_leave, applyForDistrict, approve_join_club, approve_leave_club, createNewClub, deleteClub, display_all_Club_basedOn_user_district, displayDistrictFullDetails, display_existing_club, displayAllClubs, displayAllClubsInDb, displayClubDashboard, displayClubProfile, displaySingleClub, exceptOwnDistrictDisplayAllDistrict, pendingApprovals, reject_join_club, removeAffiliation, reports, updateClub } from "./club.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

/** Must match `role` on BaseAuth (discriminator values). Edit to restrict who can list district clubs. */
const USER_DISTRICT_CLUB_ROLES = [
    "skater",
    "Parent",
    "School",
    "Academy",
    "Official",
    "Guest",
    "admin",
];

const router = express.Router();

// ============ skater club ===================

router.get("/v1/display-all-district", authenticate(["Club"]), exceptOwnDistrictDisplayAllDistrict);
router.get("/v1/display-district-full-details/:id", displayDistrictFullDetails);
router.get("/v1/apply-for-district/:id", authenticate(["Club"]), applyForDistrict);
router.get("/v1/remove-affiliation", authenticate(["Club"]), removeAffiliation);
router.get("/v1/dashboard",
    authenticate(["Club"]),
    displayClubDashboard
)
router.get("/v1/profile", authenticate(["Club"]), displayClubProfile);
router.get("/v1/affiliated-district", authenticate(["Club"]), affiliatedDistrict);
router.get("/v1/pending-approvals", authenticate(["Club"]), pendingApprovals);

router.get("/v1/reports", authenticate(["Club"]), reports);


router.get("/v1/skater/display-existing-club",
    authenticate(["Skater"]),
    display_existing_club
)

// apply for join
router.get("/v1/apply-join/:id",
    authenticate(["Skater"]),
    apply_club);

// apply for leave
router.get("/v1/apply-leave",
    authenticate(["Skater"]),
    apply_leave);

// approve for join
router.get("/v1/approve-join/:id",
    authenticate(["Club"]),
    approve_join_club);

// approve for join
router.get("/v1/reject-join/:id",
    authenticate(["Club"]),
    reject_join_club);

// approve for leave
router.get("/v1/approve-leave/:id", authenticate(["Club"]), approve_leave_club);
router.get("/v1/display-all", authenticate(["Admin", "State"]), displayAllClubsInDb);
router.get("/v1/all/:id",
    displayAllClubs);
router.post("/v1",
    authenticate(["Admin","State"]),
    upload.single("img"),
    uploadToS3("clubs"),
    validate(createClubValidation),
    createNewClub);
// Static path must be registered before /v1/:id or Express will treat "user-district-clubs" as an id.
router.get(
    "/v1/user-district-clubs",
    authenticate(["Skater"]),
    display_all_Club_basedOn_user_district
);
router.get("/v1/:id",
    displaySingleClub);
router.patch("/v1/:id",
    upload.single("img"),
     authenticate(["Admin","State"]),
    validate(editClubValidation),
    updateClub);
router.delete("/v1/:id",
     authenticate(["Admin","State"]),
    deleteClub);



export default router;