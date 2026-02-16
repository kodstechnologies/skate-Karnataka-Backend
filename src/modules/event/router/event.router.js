import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import { displayAllEvents, displayEventById } from "../controller/event.controller.js";

const router = express.Router();

/**
 * @description Display all events
 * @route GET /event/display
 * @access Private (user)
 */
router.get("/display", authenticate(["user"]), displayAllEvents);

/**
 * @description Display event by ID
 * @route GET /event/display/:id
 * @access Private (user)
 */
router.get("/display/:id", authenticate(["user"]), displayEventById);

export default router;
