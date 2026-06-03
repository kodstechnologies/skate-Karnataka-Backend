import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    getChestNumbersByEvent,
    generateChestNumbers,
} from "./competition.controller.js";

const router = express.Router();

// GET all chest numbers for an event
router.get(
    "/v1/chest-numbers/:eventId",
    authenticate(["Parent", "Skater", "Club", "District", "State", "Admin"]),
    getChestNumbersByEvent
);

// POST manually generate chest numbers for an event (restricted to State and Admin)
router.post(
    "/v1/chest-numbers/generate",
    authenticate(["State", "Admin"]),
    generateChestNumbers
);

export default router;