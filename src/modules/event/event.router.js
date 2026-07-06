import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { applyCertificationBySkater, approveCertification, rejectCertification, approveEventByAdmin, approveEventDeleteByAdmin, clubRelatedEventDisplay, clubPortalEventsDisplay, competitionAllSkater, createClubEvent, create_event, delete_event, display_all_event_based_on_user, display_latest_event, displayAllPlayedEventBySkater, displayApplications, displayLiveEvents, displayAllEvents, displayEventById, displaySkaterEventFullDetails, displaySkaterEventFormCategoryDetails, displayCompetitionDetails, edit_event, createDistrictEvent, districtRelatedEventDisplay, districtPortalEventsDisplay, givenPoint, rejectEventByAdmin, rejectEventDeleteByAdmin, stateEventResult, stateRelatedEventDisplay, stateEventSkatersSummary, updateStateSkaterTime, createStateEvent, createEventCategory, deleteEventCategory, getEventCategories, getOrgCustomEventCategory, getOrgCategoryContext, upsertOrgCustomEventCategory, getEventCategoryById, updateEventCategory, createRegisterForm, getAllRegisterDetailsByUserId, getRegisterDetailsByEventId, getRegisterFormById, getRegisterFormByUserId, getFormulas, getFormulaById, getAllFormulasLight, createFormula, updateFormula, deleteFormula, listEndedEventsForCertificates, getEventCertificateStatus, generateEventCertificatesAdmin, webStateEventsDisplay, webClubEventsDisplay, webDistrictEventsDisplay } from "./event.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import {
    create_event_category_validation,
    create_club_event_validation,
    create_district_event_validation,
    create_event_validation,
    create_state_event_validation,
    eventCategoryListQueryValidation,
    competitionDetailsParamsValidation,
    competitionAllSkaterValidation,
    given_point_validation,
    register_form_validation,
    state_skater_time_update_validation,
    stateEventResultQueryValidation,
    stateEventListQueryValidation,
    webEventListQueryValidation,
    clubPortalEventListQueryValidation,
    districtPortalEventListQueryValidation,
    stateEventSkatersListQueryValidation,
    update_event_category_validation,
    upsert_org_custom_category_validation,
    update_event_validation,
    displayApplicationsQueryValidation,
    approveCertificationParamsValidation,
    create_formula_validation,
    update_formula_validation,
    eventCertificateParamsValidation,
} from "./event.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { GetAllSkatingEventCategories } from "../skater/skater.controller.js";

const router = express.Router();

// ==================  categories display 

router.get(
    "/v1/category",
    authenticate(["Parent", "Skater", "Club", "District", "State", "Admin"]),
    GetAllSkatingEventCategories
);

// Super-admin event approval (club & district create/delete)
router.patch(
    "/v1/admin/event/:id/approve",
    authenticate(["Admin"]),
    approveEventByAdmin
);
router.patch(
    "/v1/admin/event/:id/reject",
    authenticate(["Admin"]),
    rejectEventByAdmin
);
router.patch(
    "/v1/admin/event/:id/approve-delete",
    authenticate(["Admin"]),
    approveEventDeleteByAdmin
);
router.patch(
    "/v1/admin/event/:id/reject-delete",
    authenticate(["Admin"]),
    rejectEventDeleteByAdmin
);

// Web dashboard — all events by type (Admin / State); does not replace /v1/state, /v1/club, /v1/district
router.get(
    "/v1/web/state",
    authenticate(["Admin", "State"]),
    validate(webEventListQueryValidation),
    webStateEventsDisplay
);
router.get(
    "/v1/web/club",
    authenticate(["Admin", "State"]),
    validate(webEventListQueryValidation),
    webClubEventsDisplay
);
router.get(
    "/v1/web/district",
    authenticate(["Admin", "State"]),
    validate(webEventListQueryValidation),
    webDistrictEventsDisplay
);

// ======================

router.get("/v1/club", authenticate(["Club"]), clubRelatedEventDisplay);
router.get(
    "/v1/club/web",
    authenticate(["Club"]),
    validate(clubPortalEventListQueryValidation),
    clubPortalEventsDisplay
);
router.get("/v1/club/:id", authenticate(["Club"]), clubRelatedEventDisplay);
router.post(
    "/v1/club",
    authenticate(["Club"]),
    upload.single("image"),
    validate(create_club_event_validation),
    createClubEvent
);
router.patch(
    "/v1/club/:id",
    authenticate(["Club"]),
    validate(update_event_validation),
    edit_event
);
router.delete(
    "/v1/club/:id",
    authenticate(["Club"]),
    delete_event
);
// district =====

router.get("/v1/district", authenticate(["District"]), districtRelatedEventDisplay);
router.get(
    "/v1/district/web",
    authenticate(["District"]),
    validate(districtPortalEventListQueryValidation),
    districtPortalEventsDisplay
);
router.get(
    "/v1/district/:id",
    authenticate(["District"]),
    districtRelatedEventDisplay
);
router.post(
    "/v1/district",
    authenticate(["District"]),
    upload.single("image"),
    validate(create_district_event_validation),
    createDistrictEvent
);

router.patch(
    "/v1/district/:id",
    authenticate(["District"]),
    validate(update_event_validation),
    edit_event
);
router.delete(
    "/v1/district/:id",
    authenticate(["District"]),
    delete_event
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
    authenticate(["Club", "District", "State", "Admin"]),
    validate(eventCategoryListQueryValidation),
    getEventCategories
);
router.get(
    "/v1/event-categories/org-context",
    authenticate(["Club", "District"]),
    getOrgCategoryContext
);
router.get(
    "/v1/event-categories/org-custom",
    authenticate(["Club", "District"]),
    getOrgCustomEventCategory
);
router.put(
    "/v1/event-categories/org-custom",
    authenticate(["Club", "District"]),
    validate(upsert_org_custom_category_validation),
    upsertOrgCustomEventCategory
);
/** Club/district: save override on one standard category (by category id + your club/district id). */
router.patch(
    "/v1/event-categories/:id/org-override",
    authenticate(["Club", "District"]),
    validate(update_event_category_validation),
    updateEventCategory
);
router.get(
    "/v1/event-categories/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    getEventCategoryById
);
router.post(
    "/v1/event-categories",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(create_event_category_validation),
    createEventCategory
);
router.patch(
    "/v1/event-categories/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(update_event_category_validation),
    updateEventCategory
);
router.delete(
    "/v1/event-categories/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    deleteEventCategory
);

// ======================= skater event 

router.get("/v1/latest-event", authenticate(["Skater"]), display_latest_event);

// display all event based on state , district , club 

router.get("/v1/user-all-events", authenticate(["Skater"]), display_all_event_based_on_user);

router.get(
    "/v1/event-full-details/:id",
    authenticate(["Skater"]),
    displaySkaterEventFullDetails
);

router.get(
    "/v1/event-form-details/:id",
    authenticate(["Skater"]),
    displaySkaterEventFormCategoryDetails
);

// ================================== skater register 

router.get("/v1/register-form", authenticate(["Skater"]), getRegisterFormByUserId);
router.get("/v1/register-form/:id", authenticate(["Skater"]), getRegisterFormById);
router.post(
    "/v1/register-form",
    authenticate(["Skater"]),
    validate(register_form_validation),
    createRegisterForm
);

router.get("/v1/register-details", authenticate(["Skater"]), getAllRegisterDetailsByUserId);
router.get("/v1/register-details/:id", authenticate(["Skater"]), getRegisterDetailsByEventId);
// ===================== given point (Club / District / State / Admin)

router.get(
    "/v1/live-event",
    authenticate(["Club", "District", "State", "Admin"]),
    displayLiveEvents
);

router.get(
    "/v1/competition-details/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(competitionDetailsParamsValidation),
    displayCompetitionDetails
);

router.post(
    "/v1/competition-all-skater",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(competitionAllSkaterValidation),
    competitionAllSkater
);

router.post(
    "/v1/given-point",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(given_point_validation),
    givenPoint
);

// ======================== approve certification 
router.get(
    "/v1/approve-certification/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(approveCertificationParamsValidation),
    approveCertification
);
router.get(
    "/v1/reject-certification/:id",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(approveCertificationParamsValidation),
    rejectCertification
);
router.get(
    "/v1/display-applications",
    authenticate(["Club", "District", "State", "Admin"]),
    validate(displayApplicationsQueryValidation),
    displayApplications
);
router.get("/v1/apply-certification/:id", authenticate(["Skater"]), applyCertificationBySkater);
router.get("/v1/display-all-played-event", authenticate(["Skater"]), displayAllPlayedEventBySkater);

// Admin: manual certificate generation after event ends (replaces daily scheduler)
router.get(
    "/v1/ended-events-certificates",
    authenticate(["Admin"]),
    listEndedEventsForCertificates
);
router.get(
    "/v1/:id/certificate-status",
    authenticate(["Admin"]),
    validate(eventCertificateParamsValidation),
    getEventCertificateStatus
);
router.post(
    "/v1/:id/generate-certificates",
    authenticate(["Admin"]),
    validate(eventCertificateParamsValidation),
    generateEventCertificatesAdmin
);

// formula 

router.get("/v1/formula", authenticate(["Admin"]), getFormulas);
router.get("/v1/formula/all", authenticate(["Admin"]), getAllFormulasLight);
router.get("/v1/formula/:id", authenticate(["Admin"]), getFormulaById);
router.post("/v1/formula", authenticate(["Admin"]), validate(create_formula_validation), createFormula);
router.patch("/v1/formula/:id", authenticate(["Admin"]), validate(update_formula_validation), updateFormula);
router.delete("/v1/formula/:id", authenticate(["Admin"]), deleteFormula);



export default router;
