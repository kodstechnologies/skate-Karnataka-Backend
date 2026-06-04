import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import {
    addSkaterValidation,
    clubFormulaSourceValidation,
    createClubValidation,
    displayAllApplySkaterQueryValidation,
    editClubValidation,
} from "./club.validation.js";
import {
    create_formula_validation,
    update_formula_validation,
} from "../event/event.validation.js";
import {
    createClubFormulaHandler,
    deleteClubFormulaHandler,
    getClubFormulaById,
    getClubFormulaOptions,
    getClubFormulaSourceSetting,
    getClubFormulas,
    patchClubFormulaSourceSetting,
    updateClubFormulaHandler,
} from "./club.formula.controller.js";
import { addSkaterByClub, affiliatedDistrict, apply_club, apply_leave, applyForDistrict, approve_join_club, approve_leave_club, approve_rsfi_change, createNewClub, deleteClub, display_all_Club_basedOn_user_district, display_all_apply_skater, display_all_club_skater, display_club_skater_details, displayDistrictFullDetails, display_existing_club, displayAllClubs, displayAllClubsInDb, displayClubDashboard, displayClubProfile, displaySingleClub, exceptOwnDistrictDisplayAllDistrict, reject_join_club, reject_leave_club, reject_rsfi_change, remove_skater_from_club, removeAffiliation, reports, updateClub } from "./club.controller.js";
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

// ================= create skater 

router.post("/v1/add-skater",
    authenticate(["Club"]),
    validate(addSkaterValidation),
    addSkaterByClub,
);

// ============ skater club ===================
router.get("/v1/display-all-skater", authenticate(["Club"]), display_all_club_skater);
router.get("/v1/club-skater-details/:id", authenticate(["Club"]), display_club_skater_details);
router.get("/v1/remove-skater/:id", authenticate(["Club"]), remove_skater_from_club);

router.get("/v1/display-all-district", authenticate(["Club"]), exceptOwnDistrictDisplayAllDistrict);
router.get("/v1/display-district-full-details/:id", displayDistrictFullDetails);
router.get("/v1/apply-for-district/:id", authenticate(["Club"]), applyForDistrict);
router.get("/v1/remove-affiliation", authenticate(["Club"]), removeAffiliation);
router.get("/v1/dashboard",
    authenticate(["Club"]),
    displayClubDashboard
)

// =====================

router.get("/v1/profile", authenticate(["Club"]), displayClubProfile);
router.get("/v1/affiliated-district", authenticate(["Club"]), affiliatedDistrict);
router.get(
    "/v1/pending-approvals",
    authenticate(["Club"]),
    validate(displayAllApplySkaterQueryValidation),
    display_all_apply_skater
);

router.get("/v1/reports", authenticate(["Club"]), reports);

// competition formulas (club-owned + preference for admin vs club formulas)
router.get("/v1/formula", authenticate(["Club"]), getClubFormulas);
router.get("/v1/formula/options", authenticate(["Club"]), getClubFormulaOptions);
router.get(
    "/v1/formula/source",
    authenticate(["Club"]),
    getClubFormulaSourceSetting
);
router.patch(
    "/v1/formula/source",
    authenticate(["Club"]),
    validate(clubFormulaSourceValidation),
    patchClubFormulaSourceSetting
);
router.get("/v1/formula/:id", authenticate(["Club"]), getClubFormulaById);
router.post(
    "/v1/formula",
    authenticate(["Club"]),
    validate(create_formula_validation),
    createClubFormulaHandler
);
router.patch(
    "/v1/formula/:id",
    authenticate(["Club"]),
    validate(update_formula_validation),
    updateClubFormulaHandler
);
router.delete("/v1/formula/:id", authenticate(["Club"]), deleteClubFormulaHandler);

// skater =====================================  1

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

router.get(
    "/v1/user-district-clubs",
    authenticate(["Skater"]),
    display_all_Club_basedOn_user_district
);


// ===================== skater ============================ 2

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
router.get("/v1/reject-leave/:id", authenticate(["Club"]), reject_leave_club);

// RSFI ID change (use skater id from pending list skaterID field)
router.get("/v1/approve-rsfi/:id", authenticate(["Club"]), approve_rsfi_change);
router.get("/v1/reject-rsfi/:id", authenticate(["Club"]), reject_rsfi_change);

// ===================================================  club -> skater end ========= 3

router.get("/v1/display-all", authenticate(["Admin", "State"]), displayAllClubsInDb);
router.get("/v1/all/:id",
    displayAllClubs);
router.post("/v1",
    authenticate(["Admin", "State"]),
    upload.single("img"),
    uploadToS3("clubs"),
    validate(createClubValidation),
    createNewClub);
// Static path must be registered before /v1/:id or Express will treat "user-district-clubs" as an id.

router.get("/v1/:id",
    displaySingleClub);
router.patch("/v1/:id",
    upload.single("img"),
    authenticate(["Admin", "State"]),
    validate(editClubValidation),
    updateClub);
router.delete("/v1/:id",
    authenticate(["Admin", "State"]),
    deleteClub);



export default router;