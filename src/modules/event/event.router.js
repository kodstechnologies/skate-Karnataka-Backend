import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { clubRelatedEventDisplay, create_event, delete_event, display_all_event_based_on_user, display_latest_event, displayAllEvents, displayEventById, edit_event } from "./event.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { create_event_validation, update_event_validation } from "./event.validation.js";
import { upload } from "../../middleware/multer.middleware.js";

const router = express.Router();

router.get("/v1/club", authenticate(["Club"]), clubRelatedEventDisplay);

// display latest event 

router.get("/v1/latest-event", authenticate(["Skater"]), display_latest_event);

// display all event based on state , district , club 

router.get("/v1/user-all-events", authenticate(["Skater"]), display_all_event_based_on_user);


router.get("/v1/display",
    displayAllEvents);

/**
 * @description Display event by ID
 * @route GET /event/display/:id
 * @access Private (user)
 */
router.get("/v1/full-display/:id",
     authenticate(["Skater"]),
    displayEventById);


//   create event 
router.post("/v1/",
    upload.single("img"),
    validate(create_event_validation),
    create_event);
// edit event 
router.patch("/v1/:id",
    validate(update_event_validation),
    edit_event);
// delete event 
router.delete("/v1/:id", delete_event);


export default router;
