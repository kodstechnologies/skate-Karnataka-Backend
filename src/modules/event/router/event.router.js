import express from "express";
import { authenticate } from "../../../middleware/authMiddleware";

const router = express.Router();

router.get("/display", authenticate(["user"]), displayAllEvents);
router.get("/display/:id", authenticate(["user"]), displayEventById);

export default router;
