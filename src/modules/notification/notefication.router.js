import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { displayAllNotification } from "./notification.controller.js";

const router = express.Router();

router.delete("/display", authenticate(["user"]), displayAllNotification);

export default router;
