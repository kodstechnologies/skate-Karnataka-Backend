import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { create_event, delete_event, display_all_event_based_on_user, display_latest_event, displayAllEvents, displayEventById, edit_event } from "./event.controller.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { create_event_validation, update_event_validation } from "./event.validation.js";

const USER_DISTRICT_CLUB_ROLES = [
    "skater",
    "parent",
    "school",
    "academy",
    "official",
    "guest",
    "admin",
];

const router = express.Router();

// display latest event 

router.get("/latest-event", authenticate(["skater"]), display_latest_event);

// display all event based on state , district , club 

router.get("/user-all-events", authenticate(["skater"]),display_all_event_based_on_user);

/**
 * @description Display all events
 * @route GET /event/display
 * @access Private (user)
 */
router.get("/display",
    // authenticate(["skater"]),
    displayAllEvents);

/**
 * @description Display event by ID
 * @route GET /event/display/:id
 * @access Private (user)
 */
router.get("/display/:id",
    //  authenticate(["skater"]),
    displayEventById);


//   create event 
router.post("/",
    validateMultiple(create_event_validation),
     create_event);
// edit event 
router.patch("/:id",
    validateMultiple(update_event_validation),
    edit_event);
// delete event 
router.delete("/:id", delete_event);


export default router;
