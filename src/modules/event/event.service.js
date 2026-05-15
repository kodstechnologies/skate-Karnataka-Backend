import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { State } from "../state/state.model.js";
import { createEventCategoryRepository, createRegisterFormRepository, deleteEventCategoryRepository, displaySingleEventRepository, displayAllEventRepository, create_event_repositories, edit_event_repositories, delete_event_repositories, display_latest_event_repositories, display_all_event_based_on_user_repositories, clubRelatedEventDisplayRepositories, createClubEventRepositories, districtRelatedEventDisplayRepositories, createDistrictEventRepositories, enrichLeanEventsSkatingCategoryNames, getRegisterFormByIdRepository, getRegisterFormByUserIdRepository, stateRelatedEventDisplayRepositories, createStateEventRepositories, getAllEventCategoriesRepository, getEventCategoryByIdRepository, updateEventCategoryRepository, getStateEventFullDetailsByIdRepository, getStateEventResultsRepository, listEventSkatersBasicByEventIdRepository, listEventSkatersByEventIdRepository, updateEventParticipantTimingBySkaterRepository, getSkaterEventFullDetailsDtoRepository, getSkaterEventFormCategoryDetailsRepository, resolveClubIdForClubAuthUser } from "./event.repositories.js";
import { Club } from "../club/club.model.js";

const displayEventServer = async (data) => {

    const { page, limit } = data;

    const result = await displayAllEventRepository({
        page,
        limit
    });

    if (!result || result.data.length === 0) {
        throw new AppError("No events found", 404);
    }

    return result;
};

export const clubRelatedEventDisplayService = async (clubId, query) =>{
    return await clubRelatedEventDisplayRepositories(clubId, query);
}

/** State + District (club's district) + this club's events — same scope as `GET /event/v1/club` list. */
const assertUserCanAccessClubScopedEvent = async (eventId, userId) => {
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const resolvedClubId = await resolveClubIdForClubAuthUser(userId);
    const clubRow = await Club.findById(resolvedClubId).select("district").lean();
    if (!clubRow) {
        throw new AppError("Club not found", 404);
    }

    const districtId =
        clubRow.district != null ? String(clubRow.district) : null;
    const clubIdStr = String(resolvedClubId);

    const ownerRaw =
        event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
            ? event.eventFor._id
            : event.eventFor;
    const ownerId = ownerRaw != null ? String(ownerRaw) : null;

    if (event.eventType === "State") {
        return event;
    }
    if (event.eventType === "District") {
        if (districtId && ownerId === districtId) {
            return event;
        }
        throw new AppError("Forbidden", 403);
    }
    if (event.eventType === "Club") {
        if (ownerId === clubIdStr) {
            return event;
        }
        throw new AppError("Forbidden", 403);
    }

    throw new AppError("Event not found", 404);
};

export const clubEventFullDetailsService = async (eventId, { userId }) => {
    const event = await assertUserCanAccessClubScopedEvent(eventId, userId);
    const [enriched] = await enrichLeanEventsSkatingCategoryNames([event]);
    const skatersSummary = await listEventSkatersBasicByEventIdRepository(eventId);
    const payload = { ...enriched };
    if (payload.eventFor && typeof payload.eventFor === "object" && "name" in payload.eventFor) {
        payload.eventFor = payload.eventFor.name;
    }
    payload.skaterCount = skatersSummary.skaterCount;
    payload.skaters = skatersSummary.skaters;
    return payload;
};

export const createClubEventService = async (clubId, data) => {
    return await createClubEventRepositories(clubId, data);
}

export const districtRelatedEventDisplayService = async (districtUserId, query) => {
    return await districtRelatedEventDisplayRepositories(districtUserId, query);
}

export const createDistrictEventService = async (districtUserId, data) => {
    return await createDistrictEventRepositories(districtUserId, data);
}

const assertUserCanAccessDistrictEvent = async (eventId, userId) => {
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    if (event.eventType !== "District") {
        throw new AppError("Event not found", 404);
    }
    const user = await BaseAuth.findById(userId).select("district").lean();
    const districtId = user?.district || userId;
    const districtIdStr = districtId != null ? String(districtId) : null;
    const ownerId =
        event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
            ? event.eventFor._id.toString()
            : event.eventFor != null
              ? String(event.eventFor)
              : null;
    if (!districtIdStr || !ownerId || ownerId !== districtIdStr) {
        throw new AppError("Forbidden", 403);
    }
    return event;
};

export const districtEventFullDetailsService = async (eventId, { userId }) => {
    const event = await assertUserCanAccessDistrictEvent(eventId, userId);
    const [enriched] = await enrichLeanEventsSkatingCategoryNames([event]);
    const skatersSummary = await listEventSkatersBasicByEventIdRepository(eventId);
    const payload = { ...enriched };
    if (payload.eventFor && typeof payload.eventFor === "object" && "name" in payload.eventFor) {
        payload.eventFor = payload.eventFor.name;
    }
    payload.skaterCount = skatersSummary.skaterCount;
    payload.skaters = skatersSummary.skaters;
    return payload;
};

export const stateRelatedEventDisplayService = async (stateId, query) => {
    return await stateRelatedEventDisplayRepositories(stateId, query);
}

const assertUserCanAccessStateEvent = async (
    eventId,
    { role, userId },
    { enforceOwnership = true } = {}
) => {
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    if (event.eventType !== "State") {
        throw new AppError("Event not found", 404);
    }
    const normalizedRole = String(role || "").trim().toLowerCase();
    const isAdmin = normalizedRole === "admin" || normalizedRole === "superadmin";
    if (!isAdmin && enforceOwnership) {
        const ownerId =
            event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
                ? event.eventFor._id.toString()
                : event.eventFor != null
                  ? String(event.eventFor)
                  : null;
        if (!ownerId || ownerId !== userId.toString()) {
            throw new AppError("Forbidden", 403);
        }
    }
    return event;
};

export const stateEventFullDetailsService = async (eventId, { role, userId }) => {
    const event = await assertUserCanAccessStateEvent(eventId, { role, userId });
    const [enriched] = await enrichLeanEventsSkatingCategoryNames([event]);
    const skatersSummary = await listEventSkatersBasicByEventIdRepository(eventId);
    const payload = { ...enriched };
    if (payload.eventFor && typeof payload.eventFor === "object" && "name" in payload.eventFor) {
        payload.eventFor = payload.eventFor.name;
    }
    payload.skaterCount = skatersSummary.skaterCount;
    payload.skaters = skatersSummary.skaters;
    return payload;
};

export const stateEventSkatersSummaryService = async (eventId, { role, userId }, query) => {
    const event = await assertUserCanAccessStateEvent(eventId, { role, userId });
    const list = await listEventSkatersByEventIdRepository(eventId, query);
    return {
        ...list,
        event: {
            eventName: event.header ?? "",
            colorOne: event.colorOne ?? null,
            colorTwo: event.colorTwo ?? null,
            textColor: event.textColor ?? null,
        },
    };
};

export const stateEventResultsService = async (eventId, { role, userId }, query) => {
    const event = await assertUserCanAccessStateEvent(eventId, { role, userId });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventEndDate = event?.eventEndDate ? new Date(event.eventEndDate) : null;

    if (!eventEndDate || eventEndDate >= todayStart) {
        throw new AppError("Results are available from next day after event end date", 400);
    }

    const result = await getStateEventResultsRepository(eventId, query);
    return {
        event: {
            eventId: event._id,
            eventName: event.header ?? "",
            eventEndDate: event.eventEndDate ?? null,
        },
        ...result,
    };
};

export const updateStateEventSkaterTimeService = async (
    { role, userId },
    payload
) => {
    const { eventId, skaterId, registrationId } = payload;
    await assertUserCanAccessStateEvent(
        eventId,
        { role, userId },
        { enforceOwnership: false }
    );

    if (Array.isArray(payload.skaters) && payload.skaters.length > 0) {
        const updatedSkaters = [];

        for (const skaterPayload of payload.skaters) {
            const updated = await updateEventParticipantTimingBySkaterRepository(
                {
                    skaterId: skaterPayload.skaterId,
                    registrationId: skaterPayload.registrationId,
                },
                eventId,
                skaterPayload
            );
            if (!updated) {
                throw new AppError(
                    `Skater registration not found for this event: ${skaterPayload.registrationId || skaterPayload.skaterId}`,
                    404
                );
            }
            updatedSkaters.push(updated);
        }

        return {
            eventId,
            updatedCount: updatedSkaters.length,
            skaters: updatedSkaters,
        };
    }

    const updated = await updateEventParticipantTimingBySkaterRepository(
        { skaterId, registrationId },
        eventId,
        payload
    );
    if (!updated) {
        throw new AppError("Skater registration not found for this event", 404);
    }
    return {
        eventId,
        updatedCount: 1,
        skaters: [updated],
    };
};

export const createStateEventService = async (stateId, data) => {
    let resolvedStateId = stateId;

    if (resolvedStateId) {
        const state = await State.findById(resolvedStateId).select("_id").lean();
        if (state) {
            return await createStateEventRepositories(resolvedStateId, data);
        }
    }

    const fallbackState = await State.findOne().sort({ createdAt: 1 }).select("_id").lean();
    if (!fallbackState) {
        throw new AppError("No state found to create state event", 404);
    }

    resolvedStateId = fallbackState._id;
    return await createStateEventRepositories(resolvedStateId, data);
};

export const getAllEventCategoriesService = async (query) => {
    return await getAllEventCategoriesRepository(query);
};

export const getEventCategoryByIdService = async (id) => {
    const category = await getEventCategoryByIdRepository(id);
    if (!category) {
        throw new AppError("Event category not found", 404);
    }
    return category;
};

export const createEventCategoryService = async (payload) => {
    return await createEventCategoryRepository(payload);
};

export const updateEventCategoryService = async (id, payload) => {
    const updated = await updateEventCategoryRepository(id, payload);
    if (!updated) {
        throw new AppError("Event category not found", 404);
    }
    return updated;
};

export const deleteEventCategoryService = async (id) => {
    const deleted = await deleteEventCategoryRepository(id);
    if (!deleted) {
        throw new AppError("Event category not found", 404);
    }
    return deleted;
};

export const getRegisterFormByUserIdService = async (userId) => {
    return await getRegisterFormByUserIdRepository(userId);
};

export const getRegisterFormByIdService = async (id, userId) => {
    const registerForm = await getRegisterFormByIdRepository(id, userId);
    if (!registerForm) {
        throw new AppError("Register form not found", 404);
    }
    return registerForm;
};

export const createRegisterFormService = async (userId, payload) => {
    return await createRegisterFormRepository({
        ...payload,
        userId,
    });
};

export const displaySkaterEventFullDetailsService = async (eventId, skaterUserId) => {
    const dto = await getSkaterEventFullDetailsDtoRepository(eventId, skaterUserId);
    if (!dto) {
        throw new AppError("Event not found", 404);
    }
    return dto;
};

export const displaySkaterEventFormCategoryDetailsService = async (eventId, skaterUserId) => {
    const result = await getSkaterEventFormCategoryDetailsRepository(eventId, skaterUserId);
    if (!result) {
        throw new AppError("Event not found", 404);
    }
    return result;
};

const displaySingleEventDetailsServer = async (id) => {
    return await displaySingleEventRepository(id);
}

const display_latest_event_server = async (id) => {
    return await display_latest_event_repositories(id);
}

const create_event_schema = async (data) => {
    await create_event_repositories(data);
}

const edit_event_schema = async (id, data) => {
    await edit_event_repositories(id, data);
}

const delete_event_schema = async (id) => {
    await delete_event_repositories(id);
}

const display_all_event_based_on_user_service = async (id, query) => {
  return await display_all_event_based_on_user_repositories(id, query);
}

export {
    displayEventServer,
    displaySingleEventDetailsServer,
    display_latest_event_server,
    create_event_schema,
    edit_event_schema,
    delete_event_schema,
    display_all_event_based_on_user_service
};
