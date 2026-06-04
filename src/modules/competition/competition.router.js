import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { updatePointsValidation, promoteToNextRoundValidation } from "./competition.validation.js";
import {
    getChestNumbersByEvent,
    generateChestNumbers,
    getCompetitionDetailsByEvent,
    displayRound,
    updatePoints,
    promoteToNextRound,
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

// display round
router.get(
    "/v1/display-round/:eventId",
    authenticate(["Parent", "Skater", "Club", "District", "State", "Admin"]),
    displayRound
);

// GET competition details by event ID
router.get(
    "/v1/full-details/:eventId",
    authenticate(["Parent", "Skater", "Club", "District", "State", "Admin"]),
    getCompetitionDetailsByEvent
);

// Update time/position for competitors in a round
router.post(
    "/v1/update-points",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(updatePointsValidation),
    updatePoints
);

// Promote qualified skaters from current round to the next round
router.post(
    "/v1/update-round",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(promoteToNextRoundValidation),
    promoteToNextRound
);

export default router;