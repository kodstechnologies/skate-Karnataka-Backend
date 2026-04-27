import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { clubRelatedEventDisplay, createClubEvent, create_event, delete_event, display_all_event_based_on_user, display_latest_event, displayAllEvents, displayEventById, edit_event, createDistrictEvent, districtRelatedEventDisplay, stateRelatedEventDisplay, createStateEvent } from "./event.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { create_club_event_validation, create_district_event_validation, create_event_validation, create_state_event_validation, update_event_validation } from "./event.validation.js";
import { upload } from "../../middleware/multer.middleware.js";

const router = express.Router();

router.get("/v1/club", authenticate(["Club"]), clubRelatedEventDisplay);
router.post(
    "/v1/club",
    authenticate(["Club"]),
    upload.single("image"),
    validate(create_club_event_validation),
    createClubEvent
);

// district =====

router.get("/v1/district", authenticate(["District"]), districtRelatedEventDisplay);
router.post(
    "/v1/district",
    authenticate(["District"]),
    upload.single("image"),
    validate(create_district_event_validation),
    createDistrictEvent
);
// display latest event 

// state ============================
router.get("/v1/state", authenticate(["State"]), stateRelatedEventDisplay);
router.post(
    "/v1/state",
    authenticate(["State"]),
    upload.single("image"),
    validate(create_state_event_validation),
    createStateEvent
);
// =============================

router.get("/v1/latest-event", authenticate(["Skater"]), display_latest_event);

// display all event based on state , district , club 

router.get("/v1/user-all-events", authenticate(["Skater"]), display_all_event_based_on_user);


router.get("/v1/display",
    displayAllEvents);


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
