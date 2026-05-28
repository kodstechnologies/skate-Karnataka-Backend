import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    createDiscipline,
    deleteDiscipline,
    getAllDiscipline,
    getSingleDiscipline,
    updateDiscipline,
} from "./discipline.controller.js";

const router = express.Router();

router.get("/v1", getAllDiscipline);
router.get("/v1/:id", getSingleDiscipline);
router.post("/v1", authenticate(["admin", "State"]), createDiscipline);
router.patch("/v1/:id", authenticate(["admin", "State"]), updateDiscipline);
router.delete("/v1/:id", authenticate(["admin", "State"]), deleteDiscipline);


export default router;