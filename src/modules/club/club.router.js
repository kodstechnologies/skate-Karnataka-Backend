import express from "express";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { createClubValidation, editClubValidation } from "./club.validation.js";
import { createNewClub, deleteClub, displayAllClubs, displaySingleClub, updateClub } from "./club.controller.js";

const router = express.Router();

router.get("/v1/all",
    displayAllClubs);
router.post("/v1/",
    validateMultiple(createClubValidation),
    createNewClub);
router.get("/v1/:id",
    displaySingleClub);
router.patch("/v1/:id",
    validateMultiple(editClubValidation),
    updateClub);
router.delete("/v1/:id",
    deleteClub);

export default router;