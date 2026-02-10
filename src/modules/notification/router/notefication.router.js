import express from "express";
import { authenticate } from "../../../middleware/authMiddleware";

const router = express.Router();

router.delete("/display", authenticate(["user"]), displayAllNotification);

export default router;
