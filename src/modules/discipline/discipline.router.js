import express from "express";
import {
    createDiscipline,
    deleteDiscipline,
    getAllDiscipline,
    getSingleDiscipline,
    updateDiscipline,
} from "./discipline.controller.js";

const router = express.Router()

router.get("/v1", getAllDiscipline);
router.get("/v1/:id", getSingleDiscipline);
router.post("/v1", createDiscipline);
router.patch("/v1/:id", updateDiscipline);
router.delete("/v1/:id", deleteDiscipline);


export default router;