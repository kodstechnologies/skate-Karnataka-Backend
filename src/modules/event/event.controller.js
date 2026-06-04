import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { generate_event_certificates_service } from "../certificate/certificate.service.js";
import {
    get_event_certificate_status_repository,
    list_events_ended_for_admin_certificate_repository,
} from "../certificate/certificate.repositories.js";
import {
  applyCertificationBySkaterService,
  approveCertificationByRoleService,
  rejectCertificationByRoleService,
  approveEventByAdminService,
  approveEventDeleteByAdminService,
  rejectEventByAdminService,
  rejectEventDeleteByAdminService,
  clubEventFullDetailsService,
  clubRelatedEventDisplayService,
  competitionAllSkaterService,
  competitionDetailsService,
  createClubEventService,
  createDistrictEventService,
  createEventCategoryService,
  createRegisterFormService,
  createStateEventService,
  create_event_schema,
  deleteEventCategoryService,
  delete_event_schema,
  display_all_event_based_on_user_service,
  display_latest_event_server,
  displayCertificationApplicationsService,
  displayEventServer,
  displaySingleEventDetailsServer,
  displaySkaterEventFullDetailsService,
  displaySkaterEventFormCategoryDetailsService,
  districtEventFullDetailsService,
  districtRelatedEventDisplayService,
  edit_event_schema,
  getAllPlayedEventsBySkaterService,
  getLiveEventsService,
  givenPointEventService,
  getAllEventCategoriesService,
  getAllRegisterDetailsByUserIdService,
  getEventCategoryByIdService,
  getOrgCustomEventCategoryService,
  getOrgCategoryContextService,
  upsertOrgCustomEventCategoryService,
  getRegisterDetailsByEventIdService,
  getRegisterFormByIdService,
  getRegisterFormByUserIdService,
  stateEventFullDetailsService,
  stateEventResultsService,
  stateEventSkatersSummaryService,
  stateRelatedEventDisplayService,
  updateEventCategoryService,
  updateStateEventSkaterTimeService,
} from "./event.service.js";
import { initiateRazorpayPaymentServices } from "../payment/payment.services.js";
import Formula from "./Formula.model.js";


const display_latest_event = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await display_latest_event_server(userId);

    return res.status(200).json(
        new ApiResponse(
            200,
            result ?? null,
            "Latest event fetched successfully"
        )
    );
});

// =============================== club  

export const clubRelatedEventDisplay = asyncHandler(async (req, res) => {
    const tokenUserId = req.user._id;
    const { id: eventId } = req.params;

    if (eventId) {
        const event = await clubEventFullDetailsService(eventId, {
            userId: tokenUserId,
        });
        return res.status(200).json(
            new ApiResponse(200, event, "Event displayed successfully")
        );
    }

    const { page = 1, limit = 10 } = req.query;
    const events = await clubRelatedEventDisplayService(tokenUserId, { page, limit });
    return res.status(200).json({
        statusCode: 200,
        data: events.data || [],
        pagination: {
            total: events.pagination?.total || 0,
            page: events.pagination?.page || Number(page) || 1,
            limit: events.pagination?.limit || Number(limit) || 10,
            totalPages: events.pagination?.totalPages || 0,
        },
        message: "Display club event display.",
        success: true,
    });
})

export const createClubEvent = asyncHandler(async (req, res) => {
    const clubId = req.user._id;
    const event = await createClubEventService(clubId, req.body);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "Club event submitted — pending super admin approval"
        )
    );
});

// district ================================

export const districtRelatedEventDisplay = asyncHandler(async (req, res) => {
    const districtUserId = req.user._id;
    const { id: eventId } = req.params;

    if (eventId) {
        const event = await districtEventFullDetailsService(eventId, {
            userId: districtUserId,
        });
        return res.status(200).json(
            new ApiResponse(200, event, "Event displayed successfully")
        );
    }

    const { page = 1, limit = 10 } = req.query;
    const events = await districtRelatedEventDisplayService(districtUserId, { page, limit });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: events.data || [],
                pagination: {
                    total: events.total || 0,
                    page: events.page || Number(page) || 1,
                    limit: events.limit || Number(limit) || 10,
                    totalPages: events.totalPages || 0,
                },
            },
            "Display pending approver"
        )
    );
});

export const createDistrictEvent = asyncHandler(async (req, res) => {
    const districtUserId = req.user._id;
    const event = await createDistrictEventService(districtUserId, req.body);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "District event submitted — pending super admin approval"
        )
    );
});

// ===================================== state 

export const stateRelatedEventDisplay = asyncHandler(async (req, res) => {
    const role = (req.user.role || "").toLowerCase();
    const { id: eventId } = req.params;

    if (eventId) {
        const event = await stateEventFullDetailsService(eventId, {
            role: req.user.role,
            userId: req.user._id,
        });
        return res.status(200).json(
            new ApiResponse(200, event, "Event displayed successfully")
        );
    }

    const { page = 1, limit = 10, search = "", stateId: queryStateId } = req.query;
    const filterStateId =
        role === "admin" ? queryStateId : req.user._id.toString();
    const events = await stateRelatedEventDisplayService(filterStateId, {
        page,
        limit,
        search,
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: events.data || [],
                pagination: {
                    total: events.total || 0,
                    page: events.page || Number(page) || 1,
                    limit: events.limit || Number(limit) || 10,
                    totalPages: events.totalPages || 0,
                },
            },
            "Display pending approver"
        )
    )
});

export const stateEventSkatersSummary = asyncHandler(async (req, res) => {
    const { id: eventId } = req.params;
    const { page = 1, limit = 10, search = "", ageGroup = "", categoryName = "" } = req.query;
    const result = await stateEventSkatersSummaryService(
        eventId,
        {
            role: req.user.role,
            userId: req.user._id,
        },
        { page, limit, search, ageGroup, categoryName }
    );
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                eventId,
                event: result.event || {
                    eventName: "",
                    colorOne: null,
                    colorTwo: null,
                    textColor: null,
                },
                data: result.data || [],
                pagination: {
                    total: result.total || 0,
                    page: result.page || Number(page) || 1,
                    limit: result.limit || Number(limit) || 10,
                    totalPages: result.totalPages || 0,
                },
            },
            "Event skaters fetched successfully"
        )
    );
});

export const stateEventResult = asyncHandler(async (req, res) => {
    const { id: eventId } = req.params;
    const { ageGroup = "", categoryName = "" } = req.query;
    const result = await stateEventResultsService(
        eventId,
        {
            role: req.user.role,
            userId: req.user._id,
        },
        { ageGroup, categoryName }
    );
    return res.status(200).json(
        new ApiResponse(200, result, "Event result fetched successfully")
    );
});

export const updateStateSkaterTime = asyncHandler(async (req, res) => {
    const updated = await updateStateEventSkaterTimeService(
        {
            role: req.user.role,
            userId: req.user._id,
        },
        req.body
    );
    return res.status(200).json(
        new ApiResponse(200, updated, "Skater timings updated successfully")
    );
});

export const displayCompetitionDetails = asyncHandler(async (req, res) => {
    const { id: eventId } = req.params;
    const payload = await competitionDetailsService(eventId, req.user);
    return res.status(200).json(
        new ApiResponse(200, payload, "Competition category details fetched successfully")
    );
});

export const competitionAllSkater = asyncHandler(async (req, res) => {
    const payload = await competitionAllSkaterService(req.user, req.body);
    return res.status(200).json(
        new ApiResponse(200, payload, "Competition skaters fetched successfully")
    );
});

export const givenPoint = asyncHandler(async (req, res) => {
    const updated = await givenPointEventService(req.user, req.body);
    return res.status(200).json(
        new ApiResponse(200, updated, "Participant categories updated successfully")
    );
});

export const createStateEvent = asyncHandler(async (req, res) => {
    const role = (req.user.role || "").toLowerCase();
    const body = req.body || {};
    const { stateId: bodyStateId, ...payload } = body;
    const stateId = role === "admin" ? bodyStateId : req.user._id;
    const event = await createStateEventService(stateId, payload, req.user._id);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "State event created successfully"
        )
    );
});


// =====================================
const display_all_event_based_on_user = asyncHandler(async (req, res) => {
    const userId = req.user._id; // assuming auth middleware
    const { page, limit } = req.query;

    const userBasedEvents = await display_all_event_based_on_user_service(userId, { page, limit });

    return res.status(200).json(
        new ApiResponse(
            200,
            userBasedEvents,
            "All user-based events fetched successfully"
        )
    );
});
const create_event = asyncHandler(async (req, res) => {
    console.log(req.body, "bnody")
    await create_event_schema(req.body);

    return res.status(200).json(
        new ApiResponse(
            201,
            null,
            "Event created successfully"
        )
    )
})

const edit_event = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await edit_event_schema(id, req.body, req.user);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            result?.message || "Event updated successfully"
        )
    );
});

const delete_event = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await delete_event_schema(id, req.user);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            result?.message || "Event deleted successfully"
        )
    );
});

export const approveEventByAdmin = asyncHandler(async (req, res) => {
    const event = await approveEventByAdminService(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, event, "Event approved successfully"));
});

export const rejectEventByAdmin = asyncHandler(async (req, res) => {
    const event = await rejectEventByAdminService(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, event, "Event rejected"));
});

export const approveEventDeleteByAdmin = asyncHandler(async (req, res) => {
    const result = await approveEventDeleteByAdminService(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Event delete approved"));
});

export const rejectEventDeleteByAdmin = asyncHandler(async (req, res) => {
    const event = await rejectEventDeleteByAdminService(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, event, "Event delete request rejected"));
});

const displayAllEvents = asyncHandler(async (req, res) => {

    const result = await displayEventServer(req.query);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Events fetched successfully"
        )
    );
});

const displayEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const event = await displaySingleEventDetailsServer(id);
    console.log("🚀 ~ result:", event)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                event,
                "Event displayed successfully"
            )
        );
});

export const displaySkaterEventFullDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = await displaySkaterEventFullDetailsService(id, req.user._id);
    return res.status(200).json(
        new ApiResponse(200, payload, "Event full details fetched successfully")
    );
});

export const displaySkaterEventFormCategoryDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = await displaySkaterEventFormCategoryDetailsService(id, req.user._id);
    return res.status(200).json(
        new ApiResponse(200, payload, "Event category form details fetched successfully")
    );
});

export const getEventCategories = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const categories = await getAllEventCategoriesService({ page, limit }, req.user);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    data: categories.data || [],
                    pagination: {
                        total: categories.total || 0,
                        page: categories.page || Number(page) || 1,
                        limit: categories.limit || Number(limit) || 10,
                        totalPages: categories.totalPages || 0,
                    },
                },
                "Event categories fetched successfully"
            )
        );
});

export const getOrgCustomEventCategory = asyncHandler(async (req, res) => {
    const category = await getOrgCustomEventCategoryService(req.user);
    return res.status(200).json(
        new ApiResponse(200, category, "Org custom event categories fetched successfully")
    );
});

export const getOrgCategoryContext = asyncHandler(async (req, res) => {
    const context = await getOrgCategoryContextService(req.user);
    return res.status(200).json(
        new ApiResponse(200, context, "Org category context fetched successfully")
    );
});

export const upsertOrgCustomEventCategory = asyncHandler(async (req, res) => {
    const category = await upsertOrgCustomEventCategoryService(req.body, req.user);
    return res.status(200).json(
        new ApiResponse(200, category, "Org custom event categories saved successfully")
    );
});

export const getEventCategoryById = asyncHandler(async (req, res) => {
    const category = await getEventCategoryByIdService(req.params.id, req.user);
    return res
        .status(200)
        .json(new ApiResponse(200, category, "Event category fetched successfully"));
});

export const createEventCategory = asyncHandler(async (req, res) => {
    const category = await createEventCategoryService(req.body, req.user);
    return res
        .status(201)
        .json(new ApiResponse(201, category, "Event category created successfully"));
});

export const updateEventCategory = asyncHandler(async (req, res) => {
    const category = await updateEventCategoryService(req.params.id, req.body, req.user);
    return res
        .status(200)
        .json(new ApiResponse(200, category, "Event category updated successfully"));
});

export const deleteEventCategory = asyncHandler(async (req, res) => {
    await deleteEventCategoryService(req.params.id, req.user);
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Event category deleted successfully"));
});

export const getRegisterFormByUserId = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const registrations = await getRegisterFormByUserIdService(userId);
    return res
        .status(200)
        .json(new ApiResponse(200, registrations, "Register form fetched successfully"));
});

export const getRegisterFormById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await getRegisterFormByIdService(req.params.id, userId);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Register form fetched successfully"));
});

export const displayLiveEvents = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await getLiveEventsService(req.user, { page, limit });
    return res.status(200).json(
        new ApiResponse(
            200,
            result?.data?.length ? result : null,
            result?.data?.length
                ? "Live events fetched successfully"
                : "No live events found"
        )
    );
});

export const getAllRegisterDetailsByUserId = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page, limit } = req.query;
    const result = await getAllRegisterDetailsByUserIdService(userId, { page, limit });
    return res.status(200).json(
        new ApiResponse(200, result, "All registration details fetched successfully")
    );
});

export const getRegisterDetailsByEventId = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await getRegisterDetailsByEventIdService(req.params.id, userId);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Registration details fetched successfully"));
});

export const createRegisterForm = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await createRegisterFormService(userId, req.body);
    const payment = await initiateRazorpayPaymentServices({
        userId,
        participantId: result?._id,
        eventId: result?.eventId,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, { registration: result, payment }, "Register form submitted successfully"));
});

export const applyCertificationBySkater = asyncHandler(async (req, res) => {
    const { participant, alreadyApplied } = await applyCertificationBySkaterService(
        req.params.id,
        req.user._id
    );
    const message = alreadyApplied
        ? "Certification already applied"
        : "Certification applied successfully";
    return res.status(200).json(new ApiResponse(200, participant, message));
});

export const displayAllPlayedEventBySkater = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await getAllPlayedEventsBySkaterService(req.user._id, { page, limit });
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Played events fetched successfully"));
});

export const displayApplications = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await displayCertificationApplicationsService(req.user, {
        page,
        limit,
    });
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Applications fetched successfully"));
});

export const approveCertification = asyncHandler(async (req, res) => {
    const participantId = req.params.id;

    const data = await approveCertificationByRoleService(req.user, participantId);
    if (!data) {
        throw new AppError("Participant not found", 404);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Certification approved successfully"));
});

export const rejectCertification = asyncHandler(async (req, res) => {
    const participantId = req.params.id;

    const data = await rejectCertificationByRoleService(req.user, participantId);
    if (!data) {
        throw new AppError("Participant not found", 404);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Certification rejected successfully"));
});

// ======================== formula CRUD

export const getFormulas = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [formulas, total] = await Promise.all([
        Formula.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Formula.countDocuments(),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: formulas,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
            "Formulas fetched successfully"
        )
    );
});

export const getFormulaById = asyncHandler(async (req, res) => {
    const formula = await Formula.findById(req.params.id).lean();
    if (!formula) {
        throw new AppError("Formula not found", 404);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, formula, "Formula fetched successfully"));
});

export const getAllFormulasLight = asyncHandler(async (req, res) => {
    const formulas = await Formula.find()
        .select("_id formulaName categoryName")
        .sort({ createdAt: -1 })
        .lean();
    return res
        .status(200)
        .json(new ApiResponse(200, formulas, "Formulas fetched successfully"));
});

export const createFormula = asyncHandler(async (req, res) => {
    const formula = await Formula.create(req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, formula, "Formula created successfully"));
});

export const updateFormula = asyncHandler(async (req, res) => {
    const formula = await Formula.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!formula) {
        throw new AppError("Formula not found", 404);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, formula, "Formula updated successfully"));
});

export const deleteFormula = asyncHandler(async (req, res) => {
    const formula = await Formula.findByIdAndDelete(req.params.id);
    if (!formula) {
        throw new AppError("Formula not found", 404);
    }
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Formula deleted successfully"));
});

/** Admin: events past end date that can have certificates generated. */
export const listEndedEventsForCertificates = asyncHandler(async (req, res) => {
    const data = await list_events_ended_for_admin_certificate_repository();
    return res.status(200).json(
        new ApiResponse(200, data, "Ended events for certificate generation")
    );
});

/** Admin: certificate generation status for one event. */
export const getEventCertificateStatus = asyncHandler(async (req, res) => {
    const status = await get_event_certificate_status_repository(req.params.id);
    if (!status) {
        throw new AppError("Event not found", 404);
    }
    return res.status(200).json(
        new ApiResponse(200, status, "Event certificate status")
    );
});

/** Admin: generate GeneratedCertificate rows for every eligible skater in the event. */
export const generateEventCertificatesAdmin = asyncHandler(async (req, res) => {
    const status = await get_event_certificate_status_repository(req.params.id);
    if (!status) {
        throw new AppError("Event not found", 404);
    }
    if (!status.eventEnded) {
        throw new AppError("Certificates can only be generated after the event has ended", 400);
    }
    if (status.eligibleCount === 0) {
        throw new AppError(
            "No medal winners to certify — complete the final round and run update-round so skaters appear in 1st, 2nd, and 3rd for each category",
            400
        );
    }
    if (status.allGenerated) {
        return res.status(200).json(
            new ApiResponse(200, status, "Certificates already generated for all eligible skaters")
        );
    }

    const result = await generate_event_certificates_service(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Event certificates processed successfully")
    );
});

export {
    displayAllEvents,
    displayEventById,
    display_latest_event,
    display_all_event_based_on_user,
    create_event,
    edit_event,
    delete_event
}