import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import { createDistrictValidation, editDistrictValidation } from "./district.validation.js";
import { createNewDistrict, deleteDistrict, displayAllDistrict, displaySingleDistrictAllClubs, updateDistrict } from "./district.controller.js";

const router = express.Router()

router.get("/v1/all",
    displayAllDistrict);
router.post("/v1/",
    validate(createDistrictValidation),
    createNewDistrict);
router.get("/v1/:id",
    displaySingleDistrictAllClubs);
router.patch("/v1/:id",
    validate(editDistrictValidation),
    updateDistrict);
router.delete("/v1/:id",
    deleteDistrict);

export default router;