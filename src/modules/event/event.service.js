import { AppError } from "../../util/common/AppError.js";
import { formatCompetitionTimeTakenFromSeconds } from "../../util/time/timeUtil.js";
import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { State } from "../state/state.model.js";
import { Skater } from "../skater/skater.model.js";
import { Event } from "./event.model.js";
import SkatingEventCategory from "./SkatingEventCategory.model.js";
import { EventParticipant } from "./eventParticipant.model.js";
import { applyCertificationBySkaterRepository, approveCertificationByRoleRepository, rejectCertificationByRoleRepository, createEventCategoryRepository, createRegisterFormRepository, deleteEventCategoryRepository, displayCertificationApplicationsRepository, displaySingleEventRepository, displayAllEventRepository, create_event_repositories, edit_event_repositories, delete_event_repositories, display_latest_event_repositories, display_all_event_based_on_user_repositories, clubRelatedEventDisplayRepositories, createClubEventRepositories, districtRelatedEventDisplayRepositories, createDistrictEventRepositories, enrichLeanEventsSkatingCategoryNames, findEventParticipantForCompetitionUpdate, getAllPlayedEventsBySkaterRepository, getAllRegisterDetailsByUserIdRepository, getLiveEventsRepository, getRegisterDetailsByEventIdRepository, getRegisterFormByIdRepository, getRegisterFormByUserIdRepository, stateRelatedEventDisplayRepositories, createStateEventRepositories, getAllEventCategoriesRepository, getEventCategoryByIdRepository, updateEventCategoryRepository, getStateEventFullDetailsByIdRepository, getStateEventResultsRepository, listCompetitionCategoryRankingsRepository, listEventSkatersBasicByEventIdRepository, listEventSkatersByEventIdRepository, recalculateAndPersistCategoryRanksRepository, updateEventParticipantTimingBySkaterRepository, getSkaterEventFullDetailsDtoRepository, getSkaterEventFormCategoryDetailsRepository, getEventSkatingEventCategoriesFullRepository, resolveClubIdForClubAuthUser } from "./event.repositories.js";
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
    const isStateMember = normalizedRole === "state";
    if (!isAdmin && !isStateMember && enforceOwnership) {
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

/**
 * Admin: any event. Club: state/district/club scope (same as club event list). District: own district events only. State: own state events only.
 */
const assertEventForGivenPoint = async (eventId, reqUser) => {
    const role = String(reqUser.role || "").trim().toLowerCase();
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    if (role === "admin" || role === "superadmin") {
        return event;
    }
    if (role === "club") {
        return assertUserCanAccessClubScopedEvent(eventId, reqUser._id);
    }
    if (role === "district") {
        if (event.eventType !== "District") {
            throw new AppError("Forbidden", 403);
        }
        const user = await BaseAuth.findById(reqUser._id).select("district").lean();
        const districtId =
            user?.district != null ? String(user.district) : String(reqUser._id);
        const ownerRaw =
            event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
                ? event.eventFor._id
                : event.eventFor;
        const ownerId = ownerRaw != null ? String(ownerRaw) : null;
        if (!ownerId || ownerId !== districtId) {
            throw new AppError("Forbidden", 403);
        }
        return event;
    }
    if (role === "state") {
        if (event.eventType !== "State") {
            throw new AppError("Forbidden", 403);
        }
        return event;
    }
    throw new AppError("Forbidden", 403);
};

export const competitionDetailsService = async (eventId, reqUser) => {
    await assertEventForGivenPoint(eventId, reqUser);
    const result = await getEventSkatingEventCategoriesFullRepository(eventId);
    if (!result) {
        throw new AppError("Event not found", 404);
    }
    return result;
};

const assertCompetitionCategoryOnEvent = async (
    eventId,
    skatingEventCategoryId,
    ageGroup,
    categoryName
) => {
    const event = await Event.findById(eventId)
        .select("header skatingEventCategories colorOne colorTwo textColor")
        .lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const linkedIds = (event.skatingEventCategories || []).map((id) => String(id));
    if (!linkedIds.includes(String(skatingEventCategoryId))) {
        throw new AppError("Skating event category is not linked to this event", 400);
    }

    const skatingCategory = await SkatingEventCategory.findById(skatingEventCategoryId).lean();
    if (!skatingCategory) {
        throw new AppError("Skating event category not found", 404);
    }

    const ageGroupEntry = (skatingCategory.ageGroups || []).find(
        (group) => group.label === ageGroup
    );
    if (!ageGroupEntry) {
        throw new AppError("Age group not found for this skating event category", 400);
    }

    const categoryExists = (ageGroupEntry.categories || []).some(
        (category) => String(category.name || "").trim() === categoryName
    );
    if (!categoryExists) {
        throw new AppError("Category name not found for this age group", 400);
    }

    return {
        eventName: event.header ?? "",
        colorOne: event.colorOne ?? null,
        colorTwo: event.colorTwo ?? null,
        textColor: event.textColor ?? null,
        skatingCategoryTypeName: skatingCategory.typeName ?? "",
    };
};

export const competitionAllSkaterService = async (reqUser, body) => {
    const {
        eventId,
        skatingEventCategoryId,
        ageGroup,
        name: categoryName,
        page = 1,
        limit = 10,
        search = "",
    } = body;

    await assertEventForGivenPoint(eventId, reqUser);

    const eventMeta = await assertCompetitionCategoryOnEvent(
        eventId,
        skatingEventCategoryId,
        ageGroup,
        categoryName
    );

    const role = String(reqUser.role || "").trim().toLowerCase();
    let clubId = null;
    if (role === "club") {
        clubId = await resolveClubIdForClubAuthUser(reqUser._id);
    }

    const [list, rankings] = await Promise.all([
        listEventSkatersByEventIdRepository(eventId, {
            page,
            limit,
            search,
            ageGroup,
            categoryName,
            categoriesId: skatingEventCategoryId,
            clubId,
        }),
        listCompetitionCategoryRankingsRepository(eventId, {
            ageGroup,
            categoryName,
            categoriesId: skatingEventCategoryId,
            clubId,
        }),
    ]);

    const rankByRegistrationId = new Map(
        (rankings.results || []).map((row) => [
            String(row.registrationId),
            row.rank ?? null,
        ])
    );

    const formatCategoryTimeTaken = (category, registrationId) => {
        if (!category) {
            return category;
        }
        const rank = rankByRegistrationId.get(String(registrationId)) ?? null;
        return {
            ...category,
            rank,
            timeTaken: formatCompetitionTimeTakenFromSeconds(category.timeTaken),
        };
    };

    const formatTopThreeRow = (row) => ({
        rank: row.rank,
        registrationId: row.registrationId,
        userId: row.userId,
        participantName: row.participantName,
        krsaId: row.krsaId,
        timeTaken: formatCompetitionTimeTakenFromSeconds(row.timeTaken),
    });

    const data = (list.data || []).map((skater) => {
        const registrationId = skater.registrationId || skater._id;
        const categories = (skater.categories || []).map((category) =>
            formatCategoryTimeTaken(category, registrationId)
        );
        const matchedCategory = categories.find(
            (category) => String(category.name || "").trim() === categoryName
        );
        return {
            ...skater,
            categories,
            category: matchedCategory || null,
        };
    });

    return {
        eventId,
        skatingEventCategoryId,
        skatingCategoryTypeName: eventMeta.skatingCategoryTypeName,
        ageGroup,
        categoryName,
        registeredCount: list.total ?? 0,
        topThree: (rankings.topThree || []).map(formatTopThreeRow),
        event: {
            eventName: eventMeta.eventName,
            colorOne: eventMeta.colorOne,
            colorTwo: eventMeta.colorTwo,
            textColor: eventMeta.textColor,
        },
        data,
        pagination: {
            total: list.total ?? 0,
            page: list.page ?? (Number(page) || 1),
            limit: list.limit ?? (Number(limit) || 10),
            totalPages: list.totalPages ?? 0,
        },
    };
};

const assertClubCanAccessParticipant = async (reqUser, participant) => {
    const role = String(reqUser.role || "").trim().toLowerCase();
    if (role !== "club") {
        return;
    }
    const resolvedClubId = await resolveClubIdForClubAuthUser(reqUser._id);
    const skaterProfile = await Skater.findById(participant.userId).select("club").lean();
    if (!skaterProfile?.club || String(skaterProfile.club) !== String(resolvedClubId)) {
        throw new AppError("Forbidden: skater is not registered under your club", 403);
    }
};

export const givenPointEventService = async (reqUser, body) => {
    const { eventId } = body;

    await assertEventForGivenPoint(eventId, reqUser);

    if (Array.isArray(body.skaters) && body.skaters.length > 0) {
        const {
            skatingEventCategoryId,
            ageGroup,
            name: categoryName,
            skaters,
        } = body;

        await assertCompetitionCategoryOnEvent(
            eventId,
            skatingEventCategoryId,
            ageGroup,
            categoryName
        );

        const updatedSkaters = [];

        for (const skaterPayload of skaters) {
            const { registrationId, timeTaken, rank, isDisqualified, remarks } =
                skaterPayload;

            const hasUpdateField =
                timeTaken !== undefined ||
                rank !== undefined ||
                isDisqualified !== undefined ||
                remarks !== undefined;

            if (!hasUpdateField) {
                continue;
            }

            const participant = await findEventParticipantForCompetitionUpdate({
                eventId,
                registrationId,
                categoriesId: skatingEventCategoryId,
                ageGroup,
                categoryName,
            });

            if (!participant) {
                throw new AppError(
                    `Skater registration not found for category "${categoryName}": ${registrationId}`,
                    404
                );
            }

            await assertClubCanAccessParticipant(reqUser, participant);

            const categoryUpdate = { name: categoryName };
            if (timeTaken !== undefined) {
                categoryUpdate.timeTaken = timeTaken;
            }
            if (rank !== undefined) {
                categoryUpdate.rank = rank;
            }
            if (isDisqualified !== undefined) {
                categoryUpdate.isDisqualified = isDisqualified;
            }
            if (remarks !== undefined) {
                categoryUpdate.remarks = remarks;
            }

            const updated = await updateEventParticipantTimingBySkaterRepository(
                {
                    registrationId: registrationId || String(participant._id),
                },
                eventId,
                {
                    categories: [categoryUpdate],
                }
            );

            if (updated) {
                updatedSkaters.push(updated);
            }
        }

        await recalculateAndPersistCategoryRanksRepository({
            eventId,
            categoriesId: skatingEventCategoryId,
            ageGroup,
            categoryName,
        });

        const rankings = await listCompetitionCategoryRankingsRepository(eventId, {
            ageGroup,
            categoryName,
            categoriesId: skatingEventCategoryId,
            clubId: null,
        });

        return {
            eventId,
            skatingEventCategoryId,
            ageGroup,
            categoryName,
            updatedCount: updatedSkaters.length,
            topThree: (rankings.topThree || []).map((row) => ({
                rank: row.rank,
                registrationId: row.registrationId,
                participantName: row.participantName,
                krsaId: row.krsaId,
                timeTaken: formatCompetitionTimeTakenFromSeconds(row.timeTaken),
            })),
            skaters: updatedSkaters,
        };
    }

    const { skaterId, registrationId, categories } = body;

    const eventOid = new mongoose.Types.ObjectId(eventId);
    const participant = await EventParticipant.findOne(
        registrationId
            ? {
                  _id: new mongoose.Types.ObjectId(registrationId),
                  eventId: eventOid,
              }
            : {
                  userId: new mongoose.Types.ObjectId(skaterId),
                  eventId: eventOid,
              }
    )
        .select("_id userId")
        .lean();

    if (!participant) {
        throw new AppError("Skater registration not found for this event", 404);
    }

    await assertClubCanAccessParticipant(reqUser, participant);

    const resolvedRegistrationId = registrationId || String(participant._id);
    const updated = await updateEventParticipantTimingBySkaterRepository(
        { registrationId: resolvedRegistrationId },
        eventId,
        { eventId, registrationId: resolvedRegistrationId, categories }
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

export const createStateEventService = async (stateId, data, creatorUserId) => {
    let resolvedStateId = stateId;

    if (resolvedStateId) {
        const state = await State.findById(resolvedStateId).select("_id").lean();
        if (state) {
            return await createStateEventRepositories(resolvedStateId, data, creatorUserId);
        }
    }

    const fallbackState = await State.findOne().sort({ createdAt: 1 }).select("_id").lean();
    if (!fallbackState) {
        throw new AppError("No state found to create state event", 404);
    }

    resolvedStateId = fallbackState._id;
    return await createStateEventRepositories(resolvedStateId, data, creatorUserId);
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

export const getAllRegisterDetailsByUserIdService = async (userId, query = {}) => {
    const { page, limit } = query;
    return await getAllRegisterDetailsByUserIdRepository(userId, { page, limit });
};

export const getRegisterDetailsByEventIdService = async (eventId, userId) => {
    const details = await getRegisterDetailsByEventIdRepository(eventId, userId);
    if (!details) {
        throw new AppError("Registration not found for this event", 404);
    }
    return details;
};

export const getLiveEventsService = async (reqUser, query = {}) => {
    const role = String(reqUser?.role || "").toLowerCase();
    if (!["state", "district", "club", "admin"].includes(role)) {
        throw new AppError("Forbidden", 403);
    }
    const { page, limit } = query;
    return await getLiveEventsRepository(reqUser.role, reqUser._id, { page, limit });
};

const normalizeRegisterFormCategories = (categories = []) =>
    categories
        .map((item) => {
            if (typeof item === "string") {
                const name = item.trim();
                return name ? { name } : null;
            }
            if (item && typeof item.name === "string" && item.name.trim()) {
                return { ...item, name: item.name.trim() };
            }
            return null;
        })
        .filter(Boolean);

export const createRegisterFormService = async (userId, payload) => {
    const skater =
        (await Skater.findById(userId).select("fullName").lean()) ||
        (await BaseAuth.findById(userId).select("fullName").lean());

    const name =
        (typeof payload.name === "string" ? payload.name.trim() : "") ||
        skater?.fullName?.trim() ||
        "";

    const categories = normalizeRegisterFormCategories(payload.categories);
    if (categories.length === 0) {
        throw new AppError("At least one category is required", 400);
    }

    const doc = {
        eventId: payload.eventId,
        userId,
        name,
        ageGroup: payload.ageGroup,
        categories,
        paymentStatus: payload.paymentStatus,
    };

    const categoriesId =
        typeof payload.categoriesId === "string" ? payload.categoriesId.trim() : "";
    if (categoriesId && mongoose.Types.ObjectId.isValid(categoriesId)) {
        doc.categoriesId = categoriesId;
    }

    return await createRegisterFormRepository(doc);
};

export const applyCertificationBySkaterService = async (participantId, userId) => {
    const { participant, alreadyApplied } = await applyCertificationBySkaterRepository(
        participantId,
        userId
    );
    if (!participant) {
        throw new AppError("Participant not found", 404);
    }
    return { participant, alreadyApplied };
};

export const getAllPlayedEventsBySkaterService = async (userId, { page, limit } = {}) => {
    return await getAllPlayedEventsBySkaterRepository(userId, { page, limit });
};

export const displayCertificationApplicationsService = async (
    reqUser,
    { page, limit } = {}
) => {
    const role = String(reqUser?.role || "").trim().toLowerCase();
    if (!["club", "district", "state", "admin"].includes(role)) {
        throw new AppError("Forbidden", 403);
    }
    return await displayCertificationApplicationsRepository(reqUser, {
        page,
        limit,
    });
};

export const approveCertificationByRoleService = async (reqUser, participantId) => {
    const role = String(reqUser?.role || "").trim().toLowerCase();
    if (!["club", "district", "state", "admin"].includes(role)) {
        throw new AppError("Forbidden", 403);
    }

    const updated = await approveCertificationByRoleRepository(reqUser, participantId);
    if (!updated) {
        throw new AppError("Participant not found", 404);
    }
    return updated;
};

export const rejectCertificationByRoleService = async (reqUser, participantId) => {
    const role = String(reqUser?.role || "").trim().toLowerCase();
    if (!["club", "district", "state", "admin"].includes(role)) {
        throw new AppError("Forbidden", 403);
    }

    const updated = await rejectCertificationByRoleRepository(reqUser, participantId);
    if (!updated) {
        throw new AppError("Participant not found", 404);
    }
    return updated;
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
    const event = await Event.findById(id).select("_id").lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const registeredCount = await EventParticipant.countDocuments({ eventId: id });
    if (registeredCount > 0) {
        throw new AppError(
            "Cannot delete event: skaters are already registered for this event",
            400
        );
    }

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
