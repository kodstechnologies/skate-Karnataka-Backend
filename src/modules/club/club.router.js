import express from "express";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { createClubValidation, editClubValidation } from "./club.validation.js";
import { createNewClub, deleteClub, displayAllClubs, displaySingleClub, updateClub } from "./club.controller.js";
import { upload } from "../../middleware/multerMiddleware.js";

const router = express.Router();

router.get("/v1/all/:districtId",
    displayAllClubs);
router.post("/v1/",
    upload.single("img"),
    validateMultiple(createClubValidation),
    createNewClub);
router.get("/v1/:id",
    displaySingleClub);
router.patch("/v1/:id",
    upload.single("img"),
    validateMultiple(editClubValidation),
    updateClub);
router.delete("/v1/:id",
    deleteClub);

export default router;