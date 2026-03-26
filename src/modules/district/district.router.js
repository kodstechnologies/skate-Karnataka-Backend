import express from "express";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { createDistrictValidation, editDistrictValidation } from "./district.validation.js";
import { createNewDistrict, deleteDistrict, displayAllDistrict, displaySingleDistrictAllClubs, updateDistrict } from "./district.controller.js";

const router = express.Router()

router.get("/v1/all",
    displayAllDistrict);
router.post("/v1/",
    validateMultiple(createDistrictValidation),
    createNewDistrict);
router.get("/v1/:id",
    displaySingleDistrictAllClubs);
router.patch("/v1/:id",
    validateMultiple(editDistrictValidation),
    updateDistrict);
router.delete("/v1/:id",
    deleteDistrict);

export default router;