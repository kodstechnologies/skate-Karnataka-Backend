import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import { displayAllCompetition, displayCompetitionById } from "../controller/competition.controller.js";

const router = express.Router();

router.get("/display", authenticate(["user"]), displayAllCompetition);
router.get("/display/:id", authenticate(["user"]), displayCompetitionById);

export default router;
