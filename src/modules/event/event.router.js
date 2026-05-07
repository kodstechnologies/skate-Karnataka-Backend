import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { clubRelatedEventDisplay, createClubEvent, create_event, delete_event, display_all_event_based_on_user, display_latest_event, displayAllEvents, displayEventById, edit_event, createDistrictEvent, districtRelatedEventDisplay, stateEventResult, stateRelatedEventDisplay, stateEventSkatersSummary, updateStateSkaterTime, createStateEvent, createEventCategory, deleteEventCategory, getEventCategories, getEventCategoryById, updateEventCategory, createRegisterForm, getRegisterFormById, getRegisterFormByUserId } from "./event.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import {
    create_event_category_validation,
    create_club_event_validation,
    create_district_event_validation,
    create_event_validation,
    create_state_event_validation,
    eventCategoryListQueryValidation,
    register_form_validation,
    state_skater_time_update_validation,
    stateEventResultQueryValidation,
    stateEventListQueryValidation,
    stateEventSkatersListQueryValidation,
    update_event_category_validation,
    update_event_validation,
} from "./event.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

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
router.get(
    "/v1/state",
    authenticate(["State", "Admin"]),
    stateRelatedEventDisplay
);
router.get(
    "/v1/state/all-skater/:id",
    authenticate(["State", "Admin"]),
    validate(stateEventSkatersListQueryValidation),
    stateEventSkatersSummary
);
router.get(
    "/v1/state-result/:id",
    authenticate(["State", "Admin"]),
    validate(stateEventResultQueryValidation),
    stateEventResult
);
router.get(
    "/v1/state/:id",
    authenticate(["State", "Admin"]),
    stateRelatedEventDisplay
);
router.post(
    "/v1/state/skater-time",
    authenticate(["State", "Admin"]),
    validate(state_skater_time_update_validation),
    updateStateSkaterTime
);
router.post(
    "/v1/state",
    authenticate(["State", "Admin"]),
    upload.single("image"),
    validate(create_state_event_validation),
    createStateEvent
);
router.patch(
    "/v1/state/:id",
    authenticate(["State", "Admin"]),
    validate(update_event_validation),
    edit_event
);
router.delete(
    "/v1/state/:id",
    authenticate(["State", "Admin"]),
    delete_event
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

// =================================== create event category 
router.get(
    "/v1/event-categories",
    authenticate(["State", "Admin"]),
    validate(eventCategoryListQueryValidation),
    getEventCategories
);
router.get("/v1/event-categories/:id", authenticate(["State", "Admin"]), getEventCategoryById);
router.post(
    "/v1/event-categories",
    authenticate(["State", "Admin"]),
    validate(create_event_category_validation),
    createEventCategory
);
router.patch(
    "/v1/event-categories/:id",
    authenticate(["State", "Admin"]),
    validate(update_event_category_validation),
    updateEventCategory
);
router.delete("/v1/event-categories/:id", authenticate(["State", "Admin"]), deleteEventCategory);

// ================================== skater register 

router.get("/v1/register-form", authenticate(["Skater"]), getRegisterFormByUserId);
router.get("/v1/register-form/:id", authenticate(["Skater"]), getRegisterFormById);
router.post(
    "/v1/register-form",
    authenticate(["Skater"]),
    validate(register_form_validation),
    createRegisterForm
);


// ======================== all SkatingEventCategory
// router.get("/")

export default router;
