import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { displayAllNotification } from "./notification.controller.js";

const router = express.Router();

router.get("/v1", authenticate(["Skater","Parent","School","Academy","State","Official","Admin","Guest","Club","District"]), displayAllNotification);

export default router;
