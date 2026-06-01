import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    displayAllNotification,
    markAllNotificationsRead,
} from "./notification.controller.js";

const router = express.Router();

const NOTIFICATION_ROLES = [
    "Skater",
    "Parent",
    "School",
    "Academy",
    "Scademy",
    "State",
    "Official",
    "Admin",
    "admin",
    "Guest",
    "Club",
    "District",
];

router.get("/v1", authenticate(NOTIFICATION_ROLES), displayAllNotification);
router.patch("/v1/read-all", authenticate(NOTIFICATION_ROLES), markAllNotificationsRead);

export default router;

