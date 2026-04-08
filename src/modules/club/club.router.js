import express from "express";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { createClubValidation, editClubValidation } from "./club.validation.js";
import { createNewClub, deleteClub, display_all_Club_basedOn_user_district, displayAllClubs, displaySingleClub, updateClub } from "./club.controller.js";
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

router.get("/v1/all/:id",
    displayAllClubs);
router.post("/v1/",
    upload.single("img"),
    validateMultiple(createClubValidation),
    createNewClub);
// Static path must be registered before /v1/:id or Express will treat "user-district-clubs" as an id.
router.get(
    "/v1/user-district-clubs",
    authenticate(USER_DISTRICT_CLUB_ROLES),
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