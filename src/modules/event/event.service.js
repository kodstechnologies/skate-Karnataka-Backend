import { AppError } from "../../util/common/AppError.js";
import { formatCompetitionTimeTakenFromSeconds } from "../../util/time/timeUtil.js";
import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { State } from "../state/state.model.js";
import { Skater } from "../skater/skater.model.js";
import { Event } from "./event.model.js";
import SkatingEventCategory from "./SkatingEventCategory.model.js";
import {
    assertCanMutateCategory,
    assertCanMutateDiscipline,
    getAuthRole,
    buildAdminCategoriesListFilter,
    buildVisibleCategoriesFilter,
    isStandardCategory,
    isStateOrAdminRole as isCategoryAdminRole,
    resolveCategoryOwnershipForCreate,
} from "./skatingEventCategory.policy.js";
import {
    extractCustomCategoryRowsFromDoc,
   extractCustomNamesFromDoc,
    getOrgOverrideFromStandardDoc,
    mergeStandardWithOrgOverride,
    normalizeCategoryFormat,
    assertAgeGroupCategoriesHaveFormula,
    prepareEventCategoryPayload,
    prepareDisciplinePayload,
    resolveSkatingCategoriesForEvent,
    categoryNameOf,
    findDisciplineInCategory,
} from "./skatingEventCategory.sync.js";
/**
 * Transform frontend event categories format to database format
 * From: [{"categoryId": "cat1", "disciplines": [{"id": "disc1"}, {"id": "disc2"}]}]
 * To: {skatingEventCategories: ["cat1"], skatingEventDisciplines: ["disc1", "disc2"]}
 */
const transformEventCategoriesData = (data) => {
    const { skatingEventCategories, ...restData } = data;

    // If already in correct format (array of objects with categoryId), return as is
    if (Array.isArray(skatingEventCategories) && 
        skatingEventCategories.length > 0 && 
        typeof skatingEventCategories[0] === "object" && 
        skatingEventCategories[0].categoryId) {
        // Already in correct format for Event model
        return data;
    }

    // If we get a plain string ID (single category), convert it to object format
    if (typeof skatingEventCategories === "string" && skatingEventCategories.trim()) {
        return {
            ...restData,
            skatingEventCategories: [{
                categoryId: skatingEventCategories,
                disciplines: []
            }]
        };
    }

    // If array of strings (old format), convert to object format
    if (Array.isArray(skatingEventCategories) && 
        skatingEventCategories.length > 0 && 
        typeof skatingEventCategories[0] === "string") {
        return {
            ...restData,
            skatingEventCategories: skatingEventCategories.map(catId => ({
                categoryId: catId,
                disciplines: []
            }))
        };
    }

    // If empty or invalid format, return as is (will fail validation at mongoose level)
    return data;
};
 
import {
    resolveClubOwnerIdRepositories,
    resolveDistrictOwnerIdRepositories,
} from "../gallery/gallery.repositories.js";
import { EventParticipant } from "./eventParticipant.model.js";
import {
  EVENT_ADMIN_APPROVAL,
  canReviewerApproveEventType,
  isAdminRole,
  isEventPubliclyVisible,
  isRegistrationOpen,
  isStateOrAdminRole,
  requiresAdminApprovalOnCreate,
} from "./eventApprovalPolicy.js";
import { applyCertificationBySkaterRepository, approveCertificationByRoleRepository, rejectCertificationByRoleRepository, approveEventByAdminRepository, approveEventDeleteByAdminRepository, createEventCategoryRepository, createRegisterFormRepository, deleteEventCategoryRepository, displayCertificationApplicationsRepository, displaySingleEventRepository, displayAllEventRepository, create_event_repositories, edit_event_repositories, delete_event_repositories, display_latest_event_repositories, display_all_event_based_on_user_repositories, clubRelatedEventDisplayRepositories, createClubEventRepositories, districtRelatedEventDisplayRepositories, createDistrictEventRepositories, enrichLeanEventsSkatingCategoryNames, findEventParticipantForCompetitionUpdate, getAllPlayedEventsBySkaterRepository, getAllRegisterDetailsByUserIdRepository, getLiveEventsRepository, getRegisterDetailsByEventIdRepository, getRegisterFormByIdRepository, getRegisterFormByUserIdRepository, rejectEventByAdminRepository, rejectEventDeleteByAdminRepository, requestEventDeleteRepository, stateRelatedEventDisplayRepositories, createStateEventRepositories, getAllEventCategoriesRepository, getVisibleSkatingEventCategoriesRepository, listStandardSkatingEventCategoriesRepository, listMergedStandardCategoriesForOrgRepository, getEventCategoryByIdRepository, findOrgCustomCategoryRepository, findOrgOverrideSummaryRepository, orgHasEmbeddedOverridesRepository, upsertOrgCustomCategoryRepository, upsertClubOverrideOnCategoryRepository, upsertDistrictOverrideOnCategoryRepository, upsertClubOverrideOnDisciplineRepository, upsertDistrictOverrideOnDisciplineRepository, addDisciplinesToCategoryRepository, updateDisciplineInCategoryRepository, deleteDisciplineFromCategoryRepository, findCategoryByDisciplineIdRepository, updateEventCategoryRepository, getStateEventFullDetailsByIdRepository, getStateEventResultsRepository, listCompetitionCategoryRankingsRepository, listEventSkatersBasicByEventIdRepository, listEventSkatersByEventIdRepository, recalculateAndPersistCategoryRanksRepository, updateEventParticipantTimingBySkaterRepository, getSkaterEventFullDetailsDtoRepository, getSkaterEventFormCategoryDetailsRepository, getEventSkatingEventCategoriesFullRepository, resolveClubIdForClubAuthUser, webStateEventsDisplayRepository, webClubEventsDisplayRepository, webDistrictEventsDisplayRepository, clubPortalEventsDisplayRepository, districtPortalEventsDisplayRepository } from "./event.repositories.js";
import { Club } from "../club/club.model.js";
import { initiateRazorpayPaymentServices } from "../payment/payment.services.js";

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

export const clubPortalEventsDisplayService = async (authUserId, query) => {
    return clubPortalEventsDisplayRepository(authUserId, query);
};

/** Club-owned events only — same scope as `GET /event/v1/club` list. */
const assertUserCanAccessClubScopedEvent = async (eventId, userId) => {
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const resolvedClubId = await resolveClubIdForClubAuthUser(userId);
    const clubRow = await Club.findById(resolvedClubId).select("_id").lean();
    if (!clubRow) {
        throw new AppError("Club not found", 404);
    }

    const clubIdStr = String(resolvedClubId);
    const ownerRaw =
        event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
            ? event.eventFor._id
            : event.eventFor;
    const ownerId = ownerRaw != null ? String(ownerRaw) : null;

    if (event.eventType === "Club" && ownerId === clubIdStr) {
        return event;
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

const prepareClubDistrictEventPayload = (data = {}) => {
    const payload = { ...data };
    payload.categoryFormat = normalizeCategoryFormat(
        payload.categoryFormat ?? payload.categorySource
    );
    delete payload.categorySource;
    return payload;
};

export const createClubEventService = async (clubId, data) => {
    const transformedData = transformEventCategoriesData(data);
    return await createClubEventRepositories(clubId, prepareClubDistrictEventPayload(transformedData));
};

export const districtRelatedEventDisplayService = async (districtUserId, query) => {
    return await districtRelatedEventDisplayRepositories(districtUserId, query);
};

export const districtPortalEventsDisplayService = async (districtUserId, query) => {
    return districtPortalEventsDisplayRepository(districtUserId, query);
};

export const createDistrictEventService = async (districtUserId, data) => {
    const transformedData = transformEventCategoriesData(data);
    return await createDistrictEventRepositories(
        districtUserId,
        prepareClubDistrictEventPayload(transformedData)
    );
};

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
};

export const webStateEventsDisplayService = async (query) => {
    return webStateEventsDisplayRepository(query);
};

export const webClubEventsDisplayService = async (query) => {
    return webClubEventsDisplayRepository(query);
};

export const webDistrictEventsDisplayService = async (query) => {
    return webDistrictEventsDisplayRepository(query);
};

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
    const event = await getStateEventFullDetailsByIdRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const normalizedRole = String(role || "").trim().toLowerCase();
    const isAdmin = isStateOrAdminRole(role);
    const isStateMember = normalizedRole === "state";

    if (event.eventType === "State") {
        if (!isAdmin && !isStateMember) {
            const ownerRaw =
                event.eventFor && typeof event.eventFor === "object" && event.eventFor._id
                    ? event.eventFor._id
                    : event.eventFor;
            const ownerId = ownerRaw != null ? String(ownerRaw) : null;
            if (!ownerId || ownerId !== String(userId)) {
                throw new AppError("Forbidden", 403);
            }
        }
        if (isStateMember && !isRegistrationOpen(event.registerEndDate)) {
            throw new AppError("Event not found", 404);
        }
    } else if (event.eventType === "Club" || event.eventType === "District") {
        if (!isAdmin) {
            throw new AppError("Event not found", 404);
        }
    } else {
        throw new AppError("Event not found", 404);
    }

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
 * Admin: any event. Club: state/district/club scope. District: own district events only. State: all state events.
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

    // result.skatingEventCategories is a flat list of discipline views from resolveSkatingCategoriesForEvent
    // Each item has: _id (disciplineId), parentCategoryId, parentName, name (disciplineName), ageGroups
    // Group them by parentCategoryId to produce the desired response shape
    const categoryMap = new Map();

    for (const disciplineView of (result.skatingEventCategories || [])) {
        const catId = String(disciplineView.parentCategoryId || "");
        if (!catId) continue;

        if (!categoryMap.has(catId)) {
            categoryMap.set(catId, {
                categoryId: catId,
                name: disciplineView.parentName || "",
                disciplines: [],
                // ageGroups come from discipline level — collect from first discipline that has them
                ageGroups: [],
            });
        }

        const category = categoryMap.get(catId);

        // Add this discipline
        category.disciplines.push({
            id: String(disciplineView._id || ""),
            name: disciplineView.name || "",
        });

        // Merge ageGroups — use the first discipline's ageGroups if not yet set,
        // otherwise merge unique labels
        if (Array.isArray(disciplineView.ageGroups) && disciplineView.ageGroups.length > 0) {
            if (category.ageGroups.length === 0) {
                category.ageGroups = disciplineView.ageGroups.map((ag) => ({
                    label: ag.label || "",
                    categories: (ag.categories || []).map((c) => ({
                        name: c.name || "",
                        description: c.description || "",
                    })),
                }));
            }
        }
    }

    const skatingEventCategories = [...categoryMap.values()];

    return {
        eventId: result.eventId != null ? String(result.eventId) : "",
        eventName: result.eventName ?? "",
        eventType: result.eventType ?? "",
        isAutomated: result.isAutomated !== false,
        gender: result.gender || ["boys", "girls", "both"],
        skatingEventCategories,
    };
};

const assertCompetitionCategoryOnEvent = async (
    eventId,
    skatingEventCategoryId,
    ageGroup,
    categoryName
) => {
    const event = await Event.findById(eventId)
        .select(
            "header skatingEventCategories categoryFormat eventType eventFor colorOne colorTwo textColor"
        )
        .lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const linkedIds = (event.skatingEventCategories || []).map((id) => String(id));
    const requestedId = String(skatingEventCategoryId);

    let skatingCategoryRaw = await SkatingEventCategory.findById(requestedId).lean();
    if (!skatingCategoryRaw) {
        skatingCategoryRaw = await SkatingEventCategory.findOne({
            "disciplines._id": requestedId,
        }).lean();
    }
    if (!skatingCategoryRaw) {
        throw new AppError("Skating event category not found", 404);
    }

    if (!linkedIds.includes(String(skatingCategoryRaw._id))) {
        throw new AppError("Skating event category is not linked to this event", 400);
    }

    const resolved = resolveSkatingCategoriesForEvent(event, [skatingCategoryRaw]);
    const skatingCategory =
        resolved.find((row) => String(row._id) === requestedId) ||
        resolved.find((row) => String(row.parentCategoryId) === requestedId) ||
        resolved[0];

    if (!skatingCategory) {
        throw new AppError("Discipline not found for this skating event category", 400);
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
        skatingCategoryTypeName: skatingCategory.name || skatingCategory.typeName || "",
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

/**
 * Resolve the Karnataka / State org doc used as eventFor for state events.
 * Accepts an explicit stateId, then falls back to any State account (discriminator
 * or BaseAuth role), so Admin create works even when the client omits stateId.
 */
const resolveStateIdForEvent = async (stateId) => {
    const candidate = stateId != null ? String(stateId).trim() : "";

    if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
        const byId =
            (await State.findById(candidate).select("_id").lean()) ||
            (await BaseAuth.findOne({
                _id: candidate,
                role: { $in: ["State", "state"] },
            })
                .select("_id")
                .lean());
        if (byId?._id) return byId._id;
    }

    const fallback =
        (await State.findOne().sort({ createdAt: 1 }).select("_id").lean()) ||
        (await BaseAuth.findOne({ role: { $in: ["State", "state"] } })
            .sort({ createdAt: 1 })
            .select("_id")
            .lean());

    return fallback?._id || null;
};

export const createStateEventService = async (stateId, data, creatorUserId, creatorRole) => {
    const resolvedStateId = await resolveStateIdForEvent(stateId);
    if (!resolvedStateId) {
        throw new AppError(
            "No state found to create state event. Create a State account (Karnataka) first.",
            404
        );
    }

    // Transform new frontend format to database format
    const transformedData = transformEventCategoriesData(data);

    return await createStateEventRepositories(
        resolvedStateId,
        transformedData,
        creatorUserId,
        creatorRole
    );
};

const enrichUserForCategoryScope = async (user) => {
    if (!user?._id) {
        return { clubDocId: null, districtDocId: null };
    }

    const role = String(user.role || "").toLowerCase();
    let clubDocId = null;
    let districtDocId = null;

    if (role === "club") {
        clubDocId = await resolveClubOwnerIdRepositories(user);
    }
    if (role === "district") {
        districtDocId = await resolveDistrictOwnerIdRepositories(user);
    }

    return { clubDocId, districtDocId };
};

export const getVisibleSkatingEventCategoriesService = async (user) => {
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);
    return getVisibleSkatingEventCategoriesRepository({ clubId: clubDocId, districtId: districtDocId });
};

/**
 * Event create form: standard = admin categories only.
 * custom = district/club custom doc if it has names, else same as standard (fallback).
 */
export const getEventFormCategoriesService = async (user, source = "standard") => {
    const mode = String(source || "standard").trim().toLowerCase();
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);
    const role = String(user?.role || "").toLowerCase();

    if (mode === "custom" && (role === "club" || role === "district")) {
        const orgScope =
            role === "club"
                ? { clubId: clubDocId }
                : { districtId: districtDocId };

        const hasEmbedded = await orgHasEmbeddedOverridesRepository(orgScope);
        if (hasEmbedded) {
            const merged = await listMergedStandardCategoriesForOrgRepository(orgScope);
            return merged.filter((cat) => cat._effectiveOverride);
        }

        const customDoc =
            role === "club"
                ? await findOrgCustomCategoryRepository({ clubId: clubDocId })
                : await findOrgCustomCategoryRepository({ districtId: districtDocId });

        const names = extractCustomNamesFromDoc(customDoc);
        if (customDoc && names.length) {
            return [formatOrgCustomCategoryResponse(customDoc)];
        }
    }

    return listStandardSkatingEventCategoriesRepository();
};

export const getOrgCategoryContextService = async (user) => {
    const role = String(user?.role || "").toLowerCase();
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);

    const standardCategories = await listStandardSkatingEventCategoriesRepository();

    const orgScope =
        role === "club"
            ? { clubId: clubDocId }
            : role === "district"
              ? { districtId: districtDocId }
              : null;

    if (!orgScope) {
        throw new AppError("Only club or district accounts can view org category context", 403);
    }

    const customCategory = formatOrgCustomCategoryResponse(
        await findOrgOverrideSummaryRepository(orgScope)
    );

    const customNames = extractCustomNamesFromDoc(customCategory);
    const hasEmbedded = await orgHasEmbeddedOverridesRepository(orgScope);

    const categories = standardCategories.map((cat) => {
        const merged = mergeStandardWithOrgOverride(cat, orgScope);
        return {
            ...merged,
            name: categoryNameOf(merged),
            typeName: categoryNameOf(merged),
            hasOrgOverride: (merged.disciplines || []).some((discipline) => {
                const override = getOrgOverrideFromStandardDoc(discipline, orgScope);
                return extractCustomNamesFromDoc(override).length > 0;
            }),
        };
    });

    return {
        categories,
        standardCategories: categories,
        customCategory,
        customHasSavedNames: customNames.length > 0 || hasEmbedded,
        usesStandardFallbackForCustom: !customNames.length && !hasEmbedded,
    };
};

export const getAllEventCategoriesService = async (query, user) => {
    const role = String(user?.role || "").toLowerCase();
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);

    let filter = {};
    if (role === "club") {
        filter = buildVisibleCategoriesFilter({ clubId: clubDocId });
    } else if (role === "district") {
        filter = buildVisibleCategoriesFilter({ districtId: districtDocId });
    } else if (role === "state" || role === "admin") {
        filter = buildAdminCategoriesListFilter(query);
    } else {
        filter = buildVisibleCategoriesFilter();
    }

    return await getAllEventCategoriesRepository({ ...query, filter });
};

export const getEventCategoryByIdService = async (id, user) => {
    const category = await getEventCategoryByIdRepository(id);
    if (!category) {
        throw new AppError("Event category not found", 404);
    }

    const role = String(user?.role || "").toLowerCase();
    if (role === "club" || role === "district") {
        const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);
        if (isStandardCategory(category)) {
            return mergeStandardWithOrgOverride(category, {
                clubId: clubDocId,
                districtId: districtDocId,
            });
        }
    }

    return category;
};

const stripOwnershipFromPayload = (payload) => {
    const next = { ...payload };
    delete next.categoryStatus;
    delete next.club;
    delete next.clubId;
    delete next.district;
    delete next.districtId;
    return next;
};

const parseDisciplineCreateBody = (payload = {}) => {
    if (Array.isArray(payload.disciplines) && payload.disciplines.length) {
        return payload.disciplines;
    }
    if (payload.name || payload.typeName) {
        return [payload];
    }
    return [];
};

export const createEventCategoryService = async (payload, user) => {
    const role = getAuthRole(user);
    if (!isCategoryAdminRole(role)) {
        throw new AppError("You are not allowed to create event categories", 403);
    }

    const body = prepareEventCategoryPayload(stripOwnershipFromPayload(payload));
    const name = body.name;
    if (!name) {
        throw new AppError("Event category name is required", 400);
    }

    for (const discipline of body.disciplines || []) {
        assertAgeGroupCategoriesHaveFormula(discipline.ageGroups);
    }

    return await createEventCategoryRepository({
        name,
        disciplines: body.disciplines || [],
    });
};

export const addDisciplinesToCategoryService = async (categoryId, payload, user) => {
    const existing = await getEventCategoryByIdRepository(categoryId);
    if (!existing) {
        throw new AppError("Event category not found", 404);
    }

    const scope = await enrichUserForCategoryScope(user);
    const userPlain = typeof user?.toObject === "function" ? user.toObject({ getters: true }) : { ...user };
    const actor = { ...userPlain, ...scope };
    const rows = parseDisciplineCreateBody(payload);
    if (!rows.length) {
        throw new AppError("Provide a discipline name or a disciplines array", 400);
    }

    const ownership = isCategoryAdminRole(getAuthRole(user))
        ? resolveCategoryOwnershipForCreate(actor, payload)
        : resolveCategoryOwnershipForCreate(actor, { categoryStatus: "custom" });

    const prepared = rows.map((row) => {
        const next = prepareDisciplinePayload({
            ...stripOwnershipFromPayload(row),
            ...ownership,
        });
        if (!next.name || next.name.trim().length === 0) {
            throw new AppError("Discipline name is required. Please provide either 'name' or 'typeName' field.", 400);
        }
        assertAgeGroupCategoriesHaveFormula(next.ageGroups);
        return next;
    });

    const result = await addDisciplinesToCategoryRepository(categoryId, prepared);
    return result.category;
};

export const updateDisciplineInCategoryService = async (
    categoryId,
    disciplineId,
    payload,
    user
) => {
    const existing = await getEventCategoryByIdRepository(categoryId);
    if (!existing) {
        throw new AppError("Event category not found", 404);
    }

    const discipline = findDisciplineInCategory(existing, disciplineId);
    if (!discipline) {
        throw new AppError("Discipline not found", 404);
    }

    const scope = await enrichUserForCategoryScope(user);
    const userPlain = typeof user?.toObject === "function" ? user.toObject({ getters: true }) : { ...user };
    const actor = { ...userPlain, ...scope };
    const role = getAuthRole(user);

    if (isStandardCategory(discipline) && (role === "club" || role === "district")) {
        const overrideInput = {
            typeName: payload.name || payload.typeName,
            customCategoryNames: payload.customCategoryNames ?? payload.names,
            ageGroups: payload.ageGroups,
        };

        if (role === "club") {
            if (!actor.clubDocId) {
                throw new AppError("Club not found for this account", 404);
            }
            const updated = await upsertClubOverrideOnDisciplineRepository(
                categoryId,
                disciplineId,
                actor.clubDocId,
                overrideInput
            );
            return mergeStandardWithOrgOverride(updated, { clubId: actor.clubDocId });
        }

        if (!actor.districtDocId) {
            throw new AppError("District not found for this account", 404);
        }
        const updated = await upsertDistrictOverrideOnDisciplineRepository(
            categoryId,
            disciplineId,
            actor.districtDocId,
            overrideInput
        );
        return mergeStandardWithOrgOverride(updated, { districtId: actor.districtDocId });
    }

    assertCanMutateDiscipline(actor, discipline);

    const body = prepareDisciplinePayload(stripOwnershipFromPayload(payload));
    assertAgeGroupCategoriesHaveFormula(body.ageGroups);
    delete body.clubOverrides;
    delete body.districtOverrides;

    const result = await updateDisciplineInCategoryRepository(categoryId, disciplineId, body);
    return result.category;
};

export const deleteDisciplineFromCategoryService = async (categoryId, disciplineId, user) => {
    const existing = await getEventCategoryByIdRepository(categoryId);
    if (!existing) {
        throw new AppError("Event category not found", 404);
    }

    const discipline = findDisciplineInCategory(existing, disciplineId);
    assertCanMutateDiscipline(user, discipline);

    return deleteDisciplineFromCategoryRepository(categoryId, disciplineId);
};

export const getDisciplineByIdService = async (categoryId, disciplineId, user) => {
    const category = await getEventCategoryByIdService(categoryId, user);
    const discipline = findDisciplineInCategory(category, disciplineId);
    if (!discipline) {
        throw new AppError("Discipline not found", 404);
    }
    return {
        ...discipline,
        parentCategoryId: category._id,
        parentName: categoryNameOf(category),
    };
};

export const updateEventCategoryService = async (id, payload, user) => {
    const existing = await getEventCategoryByIdRepository(id);
    if (!existing) {
        throw new AppError("Event category not found", 404);
    }

    const scope = await enrichUserForCategoryScope(user);
    const userPlain = typeof user?.toObject === "function" ? user.toObject({ getters: true }) : { ...user };
    const actor = { ...userPlain, ...scope };
    const role = getAuthRole(user);

    if ((role === "club" || role === "district") && payload.disciplineId) {
        return updateDisciplineInCategoryService(id, payload.disciplineId, payload, user);
    }

    if (isStandardCategory(existing) === false && (role === "club" || role === "district")) {
        const overrideInput = {
            typeName: payload.name || payload.typeName,
            customCategoryNames: payload.customCategoryNames ?? payload.names,
            ageGroups: payload.ageGroups,
        };
        if (role === "club") {
            const updated = await upsertClubOverrideOnCategoryRepository(
                id,
                actor.clubDocId,
                overrideInput
            );
            return mergeStandardWithOrgOverride(updated, { clubId: actor.clubDocId });
        }
        const updated = await upsertDistrictOverrideOnCategoryRepository(
            id,
            actor.districtDocId,
            overrideInput
        );
        return mergeStandardWithOrgOverride(updated, { districtId: actor.districtDocId });
    }

    if ((role === "club" || role === "district") && (payload.ageGroups || payload.customCategoryNames || payload.names)) {
        const overrideInput = {
            typeName: payload.name || payload.typeName,
            customCategoryNames: payload.customCategoryNames ?? payload.names,
            ageGroups: payload.ageGroups,
        };
        if (role === "club") {
            if (!actor.clubDocId) {
                throw new AppError("Club not found for this account", 404);
            }
            const updated = await upsertClubOverrideOnCategoryRepository(
                id,
                actor.clubDocId,
                overrideInput
            );
            return mergeStandardWithOrgOverride(updated, { clubId: actor.clubDocId });
        }
        if (!actor.districtDocId) {
            throw new AppError("District not found for this account", 404);
        }
        const updated = await upsertDistrictOverrideOnCategoryRepository(
            id,
            actor.districtDocId,
            overrideInput
        );
        return mergeStandardWithOrgOverride(updated, { districtId: actor.districtDocId });
    }

    assertCanMutateCategory(user, existing);

    const body = prepareEventCategoryPayload(stripOwnershipFromPayload(payload));
    if (body.disciplines) {
        for (const discipline of body.disciplines) {
            assertAgeGroupCategoriesHaveFormula(discipline.ageGroups);
        }
    }

    const updated = await updateEventCategoryRepository(id, body);
    if (!updated) {
        throw new AppError("Event category not found", 404);
    }
    return updated;
};

const formatOrgCustomCategoryResponse = (doc) => {
    if (!doc) {
        return null;
    }

    return {
        ...doc,
        customCategoryNames: extractCustomCategoryRowsFromDoc(doc),
    };
};

export const getOrgCustomEventCategoryService = async (user) => {
    const role = String(user?.role || "").toLowerCase();
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);

    if (role === "club") {
        const doc = await findOrgOverrideSummaryRepository({ clubId: clubDocId });
        return formatOrgCustomCategoryResponse(doc);
    }

    if (role === "district") {
        const doc = await findOrgOverrideSummaryRepository({ districtId: districtDocId });
        return formatOrgCustomCategoryResponse(doc);
    }

    throw new AppError("Only club or district accounts have an org custom category list", 403);
};

export const upsertOrgCustomEventCategoryService = async (payload, user) => {
    const role = String(user?.role || "").toLowerCase();
    const { clubDocId, districtDocId } = await enrichUserForCategoryScope(user);

    const customCategoryNames = payload?.customCategoryNames ?? payload?.names ?? [];

    if (role === "club") {
        const doc = await upsertOrgCustomCategoryRepository({
            clubId: clubDocId,
            typeName: payload?.typeName,
            customCategoryNames,
        });
        return formatOrgCustomCategoryResponse(doc);
    }

    if (role === "district") {
        const doc = await upsertOrgCustomCategoryRepository({
            districtId: districtDocId,
            typeName: payload?.typeName,
            customCategoryNames,
        });
        return formatOrgCustomCategoryResponse(doc);
    }

    throw new AppError("Only club or district accounts can save org custom categories", 403);
};

export const deleteEventCategoryService = async (id, user) => {
    const existing = await getEventCategoryByIdRepository(id);
    if (!existing) {
        throw new AppError("Event category not found", 404);
    }

    assertCanMutateCategory(user, existing);

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

const asObjectIdString = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return mongoose.Types.ObjectId.isValid(trimmed) ? trimmed : "";
};

/** Accept either a SkatingEventCategory id or a nested discipline id as categoriesId. */
const resolveRegisterCategoryRefs = async (payload = {}) => {
    let categoriesId = asObjectIdString(payload.categoriesId);
    let discipline = asObjectIdString(payload.discipline);

    if (!categoriesId && !discipline) {
        return { categoriesId: "", discipline: "" };
    }

    if (categoriesId) {
        const asCategory = await SkatingEventCategory.findById(categoriesId)
            .select("_id")
            .lean();
        if (asCategory) {
            return { categoriesId: String(asCategory._id), discipline };
        }

        const parent = await findCategoryByDisciplineIdRepository(categoriesId);
        if (parent) {
            return {
                categoriesId: String(parent._id),
                discipline: discipline || categoriesId,
            };
        }
    }

    if (discipline) {
        const parent = await findCategoryByDisciplineIdRepository(discipline);
        if (parent) {
            return { categoriesId: String(parent._id), discipline };
        }
    }

    return { categoriesId, discipline };
};

export const createRegisterFormService = async (userId, payload) => {
    const skater = await Skater.findById(userId)
        .select("fullName club clubStatus")
        .lean();

    if (!skater) {
        throw new AppError("Skater not found", 404);
    }

    if (!skater.club || skater.clubStatus !== "join") {
        throw new AppError(
            "You must be a member of a club to register for an event",
            400
        );
    }

    const event = await Event.findById(payload.eventId).select("entryFee header").lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const existingPaid = await EventParticipant.findOne({
        eventId: payload.eventId,
        userId,
        paymentStatus: "paid",
    }).lean();
    if (existingPaid) {
        throw new AppError("Already registered for this event", 400);
    }

    const name =
        (typeof payload.name === "string" ? payload.name.trim() : "") ||
        skater?.fullName?.trim() ||
        "";

    // Handle both old and new format for categories
    let categories;
    if (payload.discipline && Array.isArray(payload.categories)) {
        // New format: discipline + multiple category names
        categories = payload.categories
            .map((item) => {
                if (typeof item === "string") {
                    const name = item.trim();
                    return name ? { name, disciplineId: payload.discipline } : null;
                }
                if (item && typeof item.name === "string" && item.name.trim()) {
                    return { ...item, name: item.name.trim(), disciplineId: payload.discipline };
                }
                return null;
            })
            .filter(Boolean);
    } else {
        // Old format: categories with disciplineIds
        categories = normalizeRegisterFormCategories(payload.categories);
    }

    if (categories.length === 0) {
        throw new AppError("At least one category is required", 400);
    }

    const registrationPayload = {
        eventId: payload.eventId,
        userId,
        name,
        ageGroup: payload.ageGroup,
        categories,
    };

    const { categoriesId, discipline } = await resolveRegisterCategoryRefs(payload);
    if (discipline) {
        registrationPayload.discipline = discipline;
    }
    if (categoriesId) {
        registrationPayload.categoriesId = categoriesId;
    }

    const payment = await initiateRazorpayPaymentServices({
        userId,
        eventId: payload.eventId,
        registrationPayload,
    });

    // Free events complete registration immediately
    if (payment?.registrationComplete || payment?.registration || payment?.participantId) {
        const registration =
            payment.registration ||
            (await EventParticipant.findById(payment.participantId).lean());

        return {
            registration,
            payment,
            registrationComplete: true,
            message: "Event registered successfully",
        };
    }

    // Paid events require payment completion
    return {
        registration: null,
        payment,
        registrationComplete: false,
        message: "Complete payment to confirm event registration",
    };
};

export const createFreeEventRegisterFormService = async (userId, payload) => {
    const skater = await Skater.findById(userId).select("fullName club clubStatus").lean();
    if (!skater) throw new AppError("Skater not found", 404);

    if (!skater.club || skater.clubStatus !== "join") {
        throw new AppError("You must be a member of a club to register for an event", 400);
    }

    const event = await Event.findById(payload.eventId).select("entryFee header").lean();
    if (!event) throw new AppError("Event not found", 404);

    const amountInPaise = Math.round(
        Number(String(event.entryFee || "0").replace(/[^0-9.]/g, "")) * 100
    );
    if (amountInPaise > 0) {
        throw new AppError(
            "This event requires payment. Use the paid registration endpoint.",
            400
        );
    }

    const existingPaid = await EventParticipant.findOne({
        eventId: payload.eventId,
        userId,
        paymentStatus: "paid",
    }).lean();
    if (existingPaid) throw new AppError("Already registered for this event", 400);

    const name =
        (typeof payload.name === "string" ? payload.name.trim() : "") ||
        skater?.fullName?.trim() ||
        "";

    // Handle both old and new format for categories
    let categories;
    if (payload.discipline && Array.isArray(payload.categories)) {
        // New format: discipline + multiple category names
        categories = payload.categories
            .map((item) => {
                if (typeof item === "string") {
                    const name = item.trim();
                    return name ? { name, disciplineId: payload.discipline } : null;
                }
                if (item && typeof item.name === "string" && item.name.trim()) {
                    return { ...item, name: item.name.trim(), disciplineId: payload.discipline };
                }
                return null;
            })
            .filter(Boolean);
    } else {
        // Old format: categories with disciplineIds
        categories = normalizeRegisterFormCategories(payload.categories);
    }

    if (categories.length === 0) throw new AppError("At least one category is required", 400);

    await EventParticipant.deleteMany({
        eventId: payload.eventId,
        userId,
        paymentStatus: { $in: ["pending", "failed"] },
    });

    const registrationPayload = {
        eventId: payload.eventId,
        userId,
        name,
        ageGroup: payload.ageGroup,
        categories,
        paymentStatus: "paid",
    };

    const { categoriesId, discipline } = await resolveRegisterCategoryRefs(payload);
    if (discipline) {
        registrationPayload.discipline = discipline;
    }
    if (categoriesId) {
        registrationPayload.categoriesId = categoriesId;
    }

    const registration = await createRegisterFormRepository(registrationPayload);

    return {
        registration,
        registrationComplete: true,
        message: "Event registered successfully",
    };
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
    const eventMeta = await Event.findById(eventId)
        .select("eventType adminApprovalStatus deleteApprovalStatus")
        .lean();
    if (!eventMeta || !isEventPubliclyVisible(eventMeta)) {
        throw new AppError("Event not found", 404);
    }
    const dto = await getSkaterEventFullDetailsDtoRepository(eventId, skaterUserId);
    if (!dto) {
        throw new AppError("Event not found", 404);
    }
    return dto;
};

const mapAgeGroupsForRegisterForm = (ageGroups = []) =>
    (Array.isArray(ageGroups) ? ageGroups : [])
        .map((ageGroup) => ({
            label: ageGroup?.label || "",
            categories: (ageGroup?.categories || [])
                .map((lapCategory) => ({
                    id: lapCategory?._id ? String(lapCategory._id) : null,
                    name: lapCategory?.name || "",
                    description: lapCategory?.description || "",
                    formula: lapCategory?.formula
                        ? {
                              id: String(lapCategory.formula._id || lapCategory.formula),
                              name:
                                  lapCategory.formula.formulaName ||
                                  lapCategory.formula.categoryName ||
                                  null,
                          }
                        : null,
                }))
                .filter((lap) => lap.name.trim()),
        }))
        .filter((ageGroup) => ageGroup.label && ageGroup.categories.length > 0);

const toRegisterFormCategoryItem = (cat) => {
    if (!cat || typeof cat !== "object") return null;

    const nestedAgeGroups = (cat.disciplines || []).flatMap((disc) =>
        mapAgeGroupsForRegisterForm(disc?.ageGroups)
    );
    const ageGroups = mapAgeGroupsForRegisterForm(cat.ageGroups);
    const resolvedAgeGroups = ageGroups.length ? ageGroups : nestedAgeGroups;

    const name = categoryNameOf(cat) || cat.name || cat.typeName || null;
    if (!name) return null;

    const id = cat._id
        ? String(cat._id)
        : cat.id
          ? String(cat.id)
          : cat.categoryId
            ? String(cat.categoryId)
            : null;

    return {
        _id: id,
        categoryId: cat.parentCategoryId ? String(cat.parentCategoryId) : id,
        parentCategoryId: cat.parentCategoryId ? String(cat.parentCategoryId) : null,
        name,
        typeName: cat.typeName || name,
        ageGroups: resolvedAgeGroups,
    };
};

export const displaySkaterEventFormCategoryDetailsService = async (eventId, skaterUserId) => {
    const result = await getSkaterEventFormCategoryDetailsRepository(eventId, skaterUserId);
    if (!result) {
        throw new AppError("Event not found or not available for registration", 404);
    }
    
    // Get the skater's discipline information for the category field
    const skater = await Skater.findById(skaterUserId)
        .select("discipline")
        .lean();
    
    // Enhance the category field to include only the skater's discipline with full structure
    if (result.category && result.category._id && skater?.discipline) {
        try {
            const fullCategoryDoc = await SkatingEventCategory.findById(result.category._id)
                .populate([
                    "disciplines.ageGroups.categories.formula",
                    "disciplines.customCategoryNames.formula"
                ])
                .lean();
            
            if (fullCategoryDoc) {
                // Find only the skater's discipline
                const skaterDiscipline = (fullCategoryDoc.disciplines || []).find(disc => 
                    String(disc._id) === String(skater.discipline)
                );
                
                if (skaterDiscipline) {
                    // Enhance the category with discipline structure
                    result.category = {
                        _id: result.category._id,
                        name: result.category.name,
                        typeName: result.category.typeName,
                        discipline: {
                            id: String(skaterDiscipline._id),
                            name: skaterDiscipline.name || ""
                        }
                    };
                }
            }
        } catch (error) {
            console.error("Error enhancing category with skater discipline:", error.message);
        }
    }
    
    // Get ALL skating event categories for the event (not filtered by skater)
    const eventCategories = result.skatingEventCategories || [];
    
    // Transform ALL categories and disciplines to match the desired format
    const transformedCategories = eventCategories.map(category => {
        const categoryData = {
            categoryId: String(category._id),
            name: category.name || category.typeName || "",
            disciplines: []
        };

        // Transform ALL disciplines within each category
        if (Array.isArray(category.disciplines)) {
            categoryData.disciplines = category.disciplines.map(discipline => ({
                id: String(discipline._id),
                name: discipline.name || "",
                ageGroups: (discipline.ageGroups || []).map(ageGroup => ({
                    label: ageGroup.label || "",
                    categories: (ageGroup.categories || []).map(cat => ({
                        id: String(cat._id || cat.id),
                        name: cat.name || "",
                        description: cat.description || "",
                        formula: cat.formula ? {
                            id: String(cat.formula._id || cat.formula.id),
                            name: cat.formula.name || ""
                        } : null
                    }))
                }))
            }));
        }

        return categoryData;
    });

    return {
        eventId: result.eventId,
        eventName: result.eventName,
        entryFee: result.entryFee,
        skaterName: result.skaterName,
        krsaId: result.krsaId,
        phone: result.phone,
        countryCode: result.countryCode,
        categoryFormat: result.categoryFormat,
        category: result.category,
        skatingEventCategories: transformedCategories
    };
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

const assertOrgOwnsEventForEdit = async (event, user, role) => {
    const normalizedRole = String(role || "").trim().toLowerCase();

    if (normalizedRole === "club" && event.eventType === "Club") {
        const clubId = await resolveClubIdForClubAuthUser(user._id);
        if (String(event.eventFor) !== String(clubId)) {
            throw new AppError("Forbidden", 403);
        }
        return;
    }

    if (normalizedRole === "district" && event.eventType === "District") {
        const districtUser = await BaseAuth.findById(user._id).select("district").lean();
        const districtId = districtUser?.district || user._id;
        if (String(event.eventFor) !== String(districtId)) {
            throw new AppError("Forbidden", 403);
        }
        return;
    }

    throw new AppError("Forbidden", 403);
};

const edit_event_schema = async (id, data, user) => {
    const existing = await Event.findById(id).lean();
    if (!existing) {
        throw new AppError("Event not found", 404);
    }

    const payload = { ...data };
    delete payload.adminApprovalStatus;
    delete payload.deleteApprovalStatus;
    delete payload.eventType;
    delete payload.eventFor;

    if (payload.categoryFormat != null || payload.categorySource != null) {
        payload.categoryFormat = normalizeCategoryFormat(
            payload.categoryFormat ?? payload.categorySource
        );
        delete payload.categorySource;
    }

    const role = String(user?.role || "").trim().toLowerCase();
    let resubmittedForApproval = false;

    if (requiresAdminApprovalOnCreate(existing.eventType)) {
        if (role === "club" || role === "district") {
            await assertOrgOwnsEventForEdit(existing, user, role);
        } else if (role === "state") {
            if (existing.eventType !== "State") {
                throw new AppError("Forbidden", 403);
            }
            const ownerId =
                existing.eventFor != null ? String(existing.eventFor) : null;
            if (!ownerId || ownerId !== String(user._id)) {
                throw new AppError("Forbidden", 403);
            }
        } else if (!isAdminRole(role)) {
            throw new AppError("Forbidden", 403);
        }

        if (existing.adminApprovalStatus === EVENT_ADMIN_APPROVAL.REJECTED) {
            payload.adminApprovalStatus = EVENT_ADMIN_APPROVAL.PENDING;
            resubmittedForApproval = true;
        }
    }

    await edit_event_repositories(id, payload);

    return {
        resubmittedForApproval,
        message: resubmittedForApproval
            ? "Event updated and resubmitted for admin approval"
            : "Event updated successfully",
    };
};

/**
 * Club/District/State: set chest-number mode.
 * isAutomated true = daily scheduler; false = manual generate only.
 * Club/District owners and State/Admin may toggle.
 */
export const updateEventChestNumberModeService = async (id, isAutomated, user) => {
    const existing = await Event.findById(id)
        .select("_id eventType eventFor isAutomated")
        .lean();
    if (!existing) {
        throw new AppError("Event not found", 404);
    }

    const role = String(user?.role || "").trim().toLowerCase();
    const eventType = String(existing.eventType || "").trim();

    if (isStateOrAdminRole(role)) {
        if (eventType !== "Club" && eventType !== "District" && eventType !== "State") {
            throw new AppError("Forbidden", 403);
        }
    } else {
        await assertOrgOwnsEventForEdit(existing, user, role);
    }

    const updated = await Event.findByIdAndUpdate(
        id,
        { $set: { isAutomated: Boolean(isAutomated) } },
        { new: true }
    )
        .select("_id header isAutomated eventType")
        .lean();

    return {
        _id: updated._id,
        header: updated.header,
        eventType: updated.eventType,
        isAutomated: updated.isAutomated !== false,
        message: updated.isAutomated
            ? "Switched to automatic"
            : "Switched to manual",
    };
};

const delete_event_schema = async (id, user) => {
    const event = await Event.findById(id)
        .select("_id eventType deleteApprovalStatus")
        .lean();
    if (!event) {
        throw new AppError("Event not found", 404);
    }

    const role = String(user?.role || "").trim().toLowerCase();

    if (isAdminRole(role)) {
        const registeredCount = await EventParticipant.countDocuments({ eventId: id });
        if (registeredCount > 0) {
            throw new AppError(
                "Cannot delete event: skaters are already registered for this event",
                400
            );
        }
        await delete_event_repositories(id);
        return {
            message: "Event deleted successfully",
            deleted: true,
            pendingDelete: false,
        };
    }

    const result = await requestEventDeleteRepository(id);
    return {
        message: result.pendingDelete
            ? "Delete request submitted for admin approval"
            : "Event deleted successfully",
        deleted: result.deleted,
        pendingDelete: result.pendingDelete,
    };
};

export const approveEventByAdminService = async (eventId, reviewerRole) => {
    const existing = await Event.findById(eventId).select("eventType").lean();
    if (!existing) {
        throw new AppError("Event not found", 404);
    }
    if (!canReviewerApproveEventType(existing.eventType, reviewerRole)) {
        throw new AppError("Forbidden", 403);
    }

    const event = await approveEventByAdminRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    return event;
};

export const rejectEventByAdminService = async (eventId, reviewerRole) => {
    const existing = await Event.findById(eventId).select("eventType").lean();
    if (!existing) {
        throw new AppError("Event not found", 404);
    }
    if (!canReviewerApproveEventType(existing.eventType, reviewerRole)) {
        throw new AppError("Forbidden", 403);
    }

    const event = await rejectEventByAdminRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    return event;
};

export const approveEventDeleteByAdminService = async (eventId) => {
    return approveEventDeleteByAdminRepository(eventId);
};

export const rejectEventDeleteByAdminService = async (eventId) => {
    const event = await rejectEventDeleteByAdminRepository(eventId);
    if (!event) {
        throw new AppError("Event not found", 404);
    }
    return event;
};

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
