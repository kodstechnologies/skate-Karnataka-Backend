import express from "express";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { createClubValidation, editClubValidation } from "./club.validation.js";
import { apply_club, apply_leave, approve_join_club, approve_leave_club, createNewClub, deleteClub, display_all_Club_basedOn_user_district, displayAllClubs, displaySingleClub, updateClub } from "./club.controller.js";
import { upload } from "../../middleware/multerMiddleware.js";
import { authenticate } from "../../middleware/authMiddleware.js";

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

// apply for join
router.get("/v1/apply-join/:id",
    authenticate(["Skater"]),
    apply_club);

// // approve for join
// router.get("/v1/approve-join/:id",
//     authenticate(["Skater"]),
//     approve_join_club);

// apply for leave
router.get("/v1/apply-leave", 
    authenticate(["Skater"]),
    apply_leave);

// approve for leave
router.get("/v1/approve-leave/:id", approve_leave_club);

router.get("/v1/all/:id",
    displayAllClubs);
router.post("/v1/",
    upload.single("img"),
    validateMultiple(createClubValidation),
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
    validateMultiple(editClubValidation),
    updateClub);
router.delete("/v1/:id",
    deleteClub);



export default router;