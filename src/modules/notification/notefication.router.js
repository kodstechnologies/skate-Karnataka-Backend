import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { displayAllNotification } from "./notification.controller.js";

const router = express.Router();

router.delete("/display", authenticate(["user"]), displayAllNotification);

export default router;
