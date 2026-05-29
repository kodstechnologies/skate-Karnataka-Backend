import mongoose from "mongoose";
import { CertificateTemplate } from "./certificateTemplate.model.js";
import { GeneratedCertificate } from "./generatedCertificate.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";

const EVENT_TYPE_TEMPLATE_FLAG = {
    Club: "CLUB",
    District: "DISTRICT",
    State: "STATE",
};

/** Certificates appear 2 days after the event end date (same rule as skater results). */
const CERTIFICATE_VISIBILITY_MS = 2 * 24 * 60 * 60 * 1000;

const parseEventEndDateTime = (eventEndDate, eventEndTime) => {
    if (!eventEndDate) return null;

    const endDate = new Date(eventEndDate);
    if (Number.isNaN(endDate.getTime())) return null;

    const rawTime = String(eventEndTime || "").trim();
    if (!rawTime) {
        endDate.setHours(23, 59, 59, 999);
        return endDate;
    }

    const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) {
        endDate.setHours(23, 59, 59, 999);
        return endDate;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridian = (match[3] || "").toUpperCase();

    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    endDate.setHours(hours, minutes, 0, 0);
    return endDate;
};

/** True when event end datetime + 1 calendar day is before referenceDate. */
const isEventEndedPlusOneDay = (event, referenceDate = new Date()) => {
    const endDateTime = parseEventEndDateTime(event?.eventEndDate, event?.eventEndTime);
    if (!endDateTime) return false;

    const threshold = new Date(endDateTime);
    threshold.setDate(threshold.getDate() + 1);
    return threshold < referenceDate;
};


/**
 * Create a brand-new certificate template document.
 * The caller is responsible for ensuring a pdfUrl is provided.
 */
const create_template_repository = async (name, pdfUrl, layout, applyTo) => {
    return await CertificateTemplate.create({ name, pdfUrl, layout, isActive: false, applyTo });
};

/**
 * Update an existing template by its MongoDB _id.
 * Only updates the fields that are provided (pdfUrl is optional).
 */
const update_template_repository = async (id, { name, pdfUrl, layout, applyTo }) => {
    const update = { layout };
    if (name !== undefined) update.name = name;
    if (pdfUrl) update.pdfUrl = pdfUrl;
    if (applyTo !== undefined) update.applyTo = applyTo;

    return await CertificateTemplate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
};

/**
 * Set one template as active and deactivate all others atomically.
 * Used by the "Set as Active" action in the admin UI.
 */
const set_active_template_repository = async (id) => {
    const template = await CertificateTemplate.findById(id);
    if (!template) return null;
    const category = template.applyTo || "STATE";
    await CertificateTemplate.updateMany({ applyTo: category }, { $set: { isActive: false } });
    return await CertificateTemplate.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true });
};

/**
 * Return all templates (lightweight projection for the dropdown list).
 */
const get_all_templates_repository = async () => {
    return await CertificateTemplate.find()
        .select("_id name isActive applyTo pdfUrl createdAt")
        .sort({ createdAt: -1 });
};

/**
 * Return the single template currently marked as active.
 * Used by the PDF generation service.
 */
const get_template_repository = async (id) => {
    return await CertificateTemplate.findById(id);
};

/**
 * Return a full template document by its _id (for the edit modal).
 */
const get_template_by_id_repository = async (id) => {
    return await CertificateTemplate.findById(id);
};

const formatCertificateEvent = (event) => {
    if (!event?._id) return null;

    return {
        id: event._id,
        header: event.header || "",
        about: event.about || "",
        registerStartDate: event.registerStartDate || null,
        registerEndDate: event.registerEndDate || null,
        eventStartDate: event.eventStartDate || null,
        eventEndDate: event.eventEndDate || null,
        eventStartTime: event.eventStartTime || "",
        eventEndTime: event.eventEndTime || "",
        address: event.address || "",
        eventType: event.eventType || "",
        status: event.status || "",
        entryFee: event.entryFee ?? "",
        colorOne: event.colorOne ?? "#6A11CB",
        colorTwo: event.colorTwo ?? "#2575FC",
        textColor: event.textColor ?? "#FFFFFF",
    };
};

/**
 * Paginated events a skater attended (one row per event), visible 2+ days after event end.
 * Multiple registrations for the same event (e.g. different category names) collapse to one row.
 */
const list_skater_participants_for_certificate_repository = async (userId, page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
        return {
            data: [],
            pagination: {
                total: 0,
                page: currentPage,
                limit: perPage,
                totalPages: 0,
            },
        };
    }

    const skaterUserId = new mongoose.Types.ObjectId(String(userId));
    const twoDaysAgo = new Date(Date.now() - CERTIFICATE_VISIBILITY_MS);

    const pipeline = [
        { $match: { userId: skaterUserId } },
        {
            $lookup: {
                from: Event.collection.name,
                localField: "eventId",
                foreignField: "_id",
                as: "event",
            },
        },
        { $unwind: "$event" },
        { $match: { "event.eventEndDate": { $lte: twoDaysAgo } } },
        {
            $lookup: {
                from: BaseAuth.collection.name,
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $sort: { "event.eventEndDate": -1, createdAt: -1 } },
        {
            $group: {
                _id: "$eventId",
                row: { $first: "$$ROOT" },
            },
        },
        { $replaceRoot: { newRoot: "$row" } },
        { $sort: { "event.eventEndDate": -1 } },
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: perPage }],
                totalCount: [{ $count: "count" }],
            },
        },
        {
            $project: {
                data: 1,
                total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
            },
        },
    ];

    const [result] = await EventParticipant.aggregate(pipeline);
    const total = result?.total ?? 0;
    const rows = Array.isArray(result?.data) ? result.data : [];

    const eventOids = [
        ...new Set(
            rows
                .map((p) => p.eventId || p.event?._id)
                .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
        ),
    ];
    const participantOids = rows
        .map((p) => p._id)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

    const documentLinkByUserAndEvent = new Map();
    const documentLinkByParticipantAndEvent = new Map();

    if (eventOids.length > 0) {
        const orConditions = [{ userId: skaterUserId, eventId: { $in: eventOids } }];
        if (participantOids.length > 0) {
            orConditions.push({ participantId: { $in: participantOids }, eventId: { $in: eventOids } });
        }

        const certificates = await GeneratedCertificate.find({ $or: orConditions })
            .select("eventId participantId userId pdfUrl")
            .sort({ updatedAt: -1 })
            .lean();

        for (const cert of certificates) {
            const pdfUrl = cert.pdfUrl?.trim() || "";
            if (!pdfUrl) continue;

            const eventKey = String(cert.eventId);
            const userKey = `${String(cert.userId)}:${eventKey}`;
            if (cert.userId && !documentLinkByUserAndEvent.has(userKey)) {
                documentLinkByUserAndEvent.set(userKey, pdfUrl);
            }

            const participantKey = `${String(cert.participantId)}:${eventKey}`;
            if (cert.participantId && !documentLinkByParticipantAndEvent.has(participantKey)) {
                documentLinkByParticipantAndEvent.set(participantKey, pdfUrl);
            }
        }
    }

    const resolveDocumentLink = (participantRow) => {
        const eventId = participantRow.eventId || participantRow.event?._id;
        if (!eventId) return "";

        const eventKey = String(eventId);
        const userKey = `${String(skaterUserId)}:${eventKey}`;
        const fromUser = documentLinkByUserAndEvent.get(userKey);
        if (fromUser) return fromUser;

        const participantKey = `${String(participantRow._id)}:${eventKey}`;
        return documentLinkByParticipantAndEvent.get(participantKey) || "";
    };

    const data = rows.map((p) => {
        const documentLink = resolveDocumentLink(p);

        return {
            _id: p._id,
            winnerKRSAId: p.user?.krsaId ?? null,
            name: p.name ?? null,
            division: p.division || p.ageGroup || null,
            ageGroup: p.ageGroup || null,
            eventName: p.event?.header || "",
            request: Boolean(p.skaterApply),
            clubAllow: Boolean(p.clubAllow),
            districtAllow: Boolean(p.districtAllow),
            stateAllow: Boolean(p.stateAllow),
            certificateID: p.certificateID ?? null,
            paymentStatus: p.paymentStatus || "pending",
            event: formatCertificateEvent(p.event),
            certificateAvailable: true,
            documentLink,
        };
    });

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: calcTotalPages(total, perPage),
        },
    };
};

const formatIssueDate = (dateValue) => {
    if (!dateValue) {
        return new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
        return String(dateValue);
    }
    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const participantHasRecordedTime = (participant) =>
    (participant.categories || []).some(
        (category) =>
            typeof category.timeTaken === "number" &&
            !Number.isNaN(category.timeTaken) &&
            category.timeTaken > 0
    );

const formatCertificatePlacement = (rank) => {
    const placement = Number(rank);
    if (placement === 1 || placement === 2 || placement === 3) {
        return String(placement);
    }
    return "attended";
};

const buildCertificateTableRows = (participant) => {
    const discipline = participant.categoriesId?.typeName || "";

    return (participant.categories || [])
        .filter(
            (category) =>
                typeof category.timeTaken === "number" &&
                !Number.isNaN(category.timeTaken) &&
                category.timeTaken > 0
        )
        .map((category) => ({
            discipline,
            distance: category.name || "",
            placement: formatCertificatePlacement(category.rank),
        }));
};

const get_event_for_certificate_repository = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        return null;
    }
    return await Event.findById(eventId)
        .select("_id header eventType eventEndDate")
        .lean();
};

const get_active_template_for_event_type_repository = async (eventType) => {
    const flag = EVENT_TYPE_TEMPLATE_FLAG[eventType];
    if (!flag) return null;

    return await CertificateTemplate.findOne({
        isActive: true,
        applyTo: flag,
    })
        .sort({ updatedAt: -1 })
        .lean();
};

const list_eligible_participants_for_event_repository = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        return [];
    }

    const eventOid = new mongoose.Types.ObjectId(String(eventId));
    const participants = await EventParticipant.find({ eventId: eventOid })
        .populate("userId", "fullName krsaId")
        .populate("categoriesId", "typeName")
        .lean();

    return participants.filter(participantHasRecordedTime);
};

const find_generated_certificate_repository = async (eventId, participantId) => {
    return await GeneratedCertificate.findOne({ eventId, participantId }).lean();
};

const get_skater_club_name_repository = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
        return "";
    }

    const skater = await Skater.findById(userId).populate("club", "name").lean();
    return skater?.club?.name || "";
};

const save_generated_certificate_repository = async (payload) => {
    return await GeneratedCertificate.create(payload);
};

const buildSkaterCertificateUserMatch = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
        return null;
    }

    const skaterUserId = new mongoose.Types.ObjectId(String(userId));
    const orConditions = [{ userId: skaterUserId }];

    const participantIds = await EventParticipant.find({ userId: skaterUserId })
        .distinct("_id");

    if (participantIds.length > 0) {
        orConditions.push({ participantId: { $in: participantIds } });
    }

    return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
};

/**
 * Distinct events where skater placed 1st (gold) or 2nd (silver) per generated certificates.
 * Matched by token userId on GeneratedCertificate.userId (and participantId fallback).
 */
const count_skater_certificate_medal_stats_repository = async ({ userId } = {}) => {
    const certificateMatch = await buildSkaterCertificateUserMatch(userId);
    if (!certificateMatch) {
        return { goldMedals: 0, silverMedals: 0 };
    }

    const [result] = await GeneratedCertificate.aggregate([
        { $match: certificateMatch },
        { $unwind: "$events" },
        {
            $addFields: {
                placementRank: {
                    $convert: {
                        input: { $trim: { input: { $ifNull: ["$events.placement", ""] } } },
                        to: "int",
                        onError: null,
                        onNull: null,
                    },
                },
            },
        },
        { $match: { placementRank: { $in: [1, 2] } } },
        {
            $facet: {
                goldMedals: [
                    { $match: { placementRank: 1 } },
                    { $group: { _id: "$eventId" } },
                    { $count: "count" },
                ],
                silverMedals: [
                    { $match: { placementRank: 2 } },
                    { $group: { _id: "$eventId" } },
                    { $count: "count" },
                ],
            },
        },
    ]);

    return {
        goldMedals: result?.goldMedals?.[0]?.count ?? 0,
        silverMedals: result?.silverMedals?.[0]?.count ?? 0,
    };
};

const event_has_any_recorded_participant_time_repository = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        return false;
    }

    const exists = await EventParticipant.exists({
        eventId: new mongoose.Types.ObjectId(String(eventId)),
        categories: {
            $elemMatch: {
                timeTaken: { $type: "number", $gt: 0 },
            },
        },
    });

    return Boolean(exists);
};

/** At least one eligible participant still lacks a GeneratedCertificate row. */
const event_has_pending_certificate_generation_repository = async (eventId) => {
    const participants = await list_eligible_participants_for_event_repository(eventId);
    if (!participants.length) return false;

    for (const participant of participants) {
        const existing = await find_generated_certificate_repository(eventId, participant._id);
        if (!existing) return true;
    }

    return false;
};

/**
 * Events where (eventEnd + 1 day) < now, at least one category time is recorded,
 * and not every eligible participant already has a generated certificate.
 */
const list_events_for_auto_certificate_generation_repository = async (
    referenceDate = new Date()
) => {
    const eventIdsWithTimes = await EventParticipant.distinct("eventId", {
        categories: {
            $elemMatch: {
                timeTaken: { $type: "number", $gt: 0 },
            },
        },
    });

    if (!eventIdsWithTimes.length) {
        return { eventsEndedPlusOneDay: 0, events: [] };
    }

    const events = await Event.find({ _id: { $in: eventIdsWithTimes } })
        .select("_id header eventType eventEndDate eventEndTime")
        .lean();

    const eventsEndedPlusOneDay = events.filter((event) =>
        isEventEndedPlusOneDay(event, referenceDate)
    );

    const pending = [];
    for (const event of eventsEndedPlusOneDay) {
        const hasTime = await event_has_any_recorded_participant_time_repository(event._id);
        if (!hasTime) continue;

        const needsGeneration = await event_has_pending_certificate_generation_repository(
            event._id
        );
        if (!needsGeneration) continue;

        pending.push(event);
    }

    return {
        eventsEndedPlusOneDay: eventsEndedPlusOneDay.length,
        events: pending,
    };
};

const build_participant_certificate_payload_repository = async (
    participant,
    event,
    templateId,
    issueDate
) => {
    const userId = participant.userId?._id || participant.userId || null;
    const clubName = await get_skater_club_name_repository(userId);

    return {
        name: participant.name || participant.userId?.fullName || "",
        ageGroup: participant.ageGroup || "",
        clubName,
        winnerKRSAId: participant.userId?.krsaId || "",
        issueDate,
        events: buildCertificateTableRows(participant),
        certificateID: participant.certificateID || null,
        participantId: participant._id,
        userId,
        eventId: event._id,
        templateId,
    };
};

export {
    formatIssueDate,
    participantHasRecordedTime,
    isEventEndedPlusOneDay,
    list_events_for_auto_certificate_generation_repository,
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
    list_skater_participants_for_certificate_repository,
    get_event_for_certificate_repository,
    get_active_template_for_event_type_repository,
    list_eligible_participants_for_event_repository,
    find_generated_certificate_repository,
    save_generated_certificate_repository,
    build_participant_certificate_payload_repository,
    count_skater_certificate_medal_stats_repository,
};