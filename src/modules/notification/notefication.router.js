import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { displayAllNotification } from "./notification.controller.js";

const router = express.Router();

router.delete("/user", authenticate(["user"]), displayAllNotification);
router.delete("/club", authenticate(["Club"]), displayAllNotification);
router.delete("/district", authenticate(["District"]), displayAllNotification);
router.delete("/state", authenticate(["State"]), displayAllNotification);
router.delete("/admin", authenticate(["Admin"]), displayAllNotification);

export default router;
