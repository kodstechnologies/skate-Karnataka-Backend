import mongoose from "mongoose";
import { CertificateTemplate } from "./certificateTemplate.model.js";
import { GeneratedCertificate } from "./generatedCertificate.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { EventCompetition } from "../competition/eventCompetition.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";

const MEDAL_ROUND_KEYS = [
    { key: "1st", placement: 1 },
    { key: "2nd", placement: 2 },
    { key: "3rd", placement: 3 },
];

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

const toLocalCalendarDay = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** True when today is the end date or later — date only, ignores eventEndTime. */
const isEventEnded = (event, referenceDate = new Date()) => {
    const endDay = toLocalCalendarDay(event?.eventEndDate);
    if (!endDay) return false;
    const today = toLocalCalendarDay(referenceDate);
    return today.getTime() >= endDay.getTime();
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
            winnerKRSAId: p.user?.krsaId || "",
            name: p.name || "",
            division: p.division || p.ageGroup || "",
            ageGroup: p.ageGroup || "",
            eventName: p.event?.header || "",
            request: Boolean(p.skaterApply),
            clubAllow: Boolean(p.clubAllow),
            districtAllow: Boolean(p.districtAllow),
            stateAllow: Boolean(p.stateAllow),
            certificateID: p.certificateID || "",
            paymentStatus: p.paymentStatus || "pending",
            event: formatCertificateEvent(p.event) || {},
            certificateAvailable: Boolean(documentLink),
            documentLink: documentLink || "",
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

/**
 * Podium skaters from EventCompetition only (category keys 1st / 2nd / 3rd).
 * Map: skaterId string → [{ ageGroup, categoryName, placement: 1|2|3 }]
 */
const buildPodiumPlacementsBySkaterForEvent = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        return new Map();
    }

    const competitions = await EventCompetition.find({
        eventId: new mongoose.Types.ObjectId(String(eventId)),
    }).lean();

    const bySkater = new Map();

    for (const competition of competitions) {
        const ageGroup = competition.ageGroup || "";
        for (const category of competition.categories || []) {
            const categoryName = category.name || "";
            for (const { key, placement } of MEDAL_ROUND_KEYS) {
                const rows = category[key] || [];
                for (const row of rows) {
                    const skaterId = row?.skaterId;
                    if (!skaterId) continue;
                    const sid = String(skaterId);
                    if (!bySkater.has(sid)) {
                        bySkater.set(sid, []);
                    }
                    bySkater.get(sid).push({
                        ageGroup,
                        categoryName,
                        placement,
                    });
                }
            }
        }
    }

    return bySkater;
};

const formatCertificatePlacement = (rank) => {
    const placement = Number(rank);
    if (placement === 1 || placement === 2 || placement === 3) {
        return String(placement);
    }
    return "attended";
};

const buildCertificateTableRows = (participant) => {
    const discipline = participant.categoriesId?.typeName || "";
    const podiumRows = participant._podiumPlacements || [];

    if (podiumRows.length) {
        return podiumRows
            .filter((row) => row.ageGroup === participant.ageGroup)
            .map((row) => ({
                discipline,
                distance: row.categoryName || "",
                placement: formatCertificatePlacement(row.placement),
            }));
    }

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

    const podiumBySkater = await buildPodiumPlacementsBySkaterForEvent(eventId);
    if (!podiumBySkater.size) {
        return [];
    }

    const skaterIds = [...podiumBySkater.keys()]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const eventOid = new mongoose.Types.ObjectId(String(eventId));
    const participants = await EventParticipant.find({
        eventId: eventOid,
        userId: { $in: skaterIds },
    })
        .populate("userId", "fullName krsaId")
        .populate("categoriesId", "typeName")
        .lean();

    return participants
        .filter((participant) => {
            const userId = String(participant.userId?._id || participant.userId || "");
            const placements = podiumBySkater.get(userId) || [];
            return placements.some((row) => row.ageGroup === participant.ageGroup);
        })
        .map((participant) => {
            const userId = String(participant.userId?._id || participant.userId || "");
            return {
                ...participant,
                _podiumPlacements: podiumBySkater.get(userId) || [],
            };
        });
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

const formatGeneratedCertificateListRow = (cert, participant = null) => {
    const eventDoc = cert.eventId;
    const pdfUrl = String(cert.pdfUrl || "").trim();

    return {
        _id: cert._id,
        eventId: eventDoc?._id ?? cert.eventId ?? null,
        eventName: eventDoc?.header || "",
        participantId: cert.participantId ?? null,
        userId: cert.userId ?? null,
        templateId: cert.templateId ?? null,
        certificateID: cert.certificateID || "",
        winnerKRSAId: cert.winnerKRSAId || "",
        name: cert.name || "",
        ageGroup: cert.ageGroup || "",
        clubName: cert.clubName || "",
        issueDate: cert.issueDate || "",
        pdfUrl,
        documentLink: pdfUrl,
        filename: cert.filename || "",
        events: Array.isArray(cert.events) ? cert.events : [],
        event: formatCertificateEvent(eventDoc),
        certificateAvailable: Boolean(pdfUrl),
        request: Boolean(participant?.skaterApply),
        clubAllow: Boolean(participant?.clubAllow),
        districtAllow: Boolean(participant?.districtAllow),
        stateAllow: Boolean(participant?.stateAllow),
        paymentStatus: participant?.paymentStatus || "pending",
        createdAt: cert.createdAt ?? null,
        updatedAt: cert.updatedAt ?? null,
    };
};

/**
 * All GeneratedCertificate rows for a skater (userId + participantId fallback).
 */
const list_generated_certificates_by_user_repository = async (userId, page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const match = await buildSkaterCertificateUserMatch(userId);
    if (!match) {
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

    const [total, certificates] = await Promise.all([
        GeneratedCertificate.countDocuments(match),
        GeneratedCertificate.find(match)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .populate({
                path: "eventId",
                select:
                    "header about registerStartDate registerEndDate eventStartDate eventEndDate eventStartTime eventEndTime address eventType status entryFee colorOne colorTwo textColor",
            })
            .lean(),
    ]);

    const participantIds = [
        ...new Set(
            certificates
                .map((cert) => cert.participantId)
                .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
                .map((id) => String(id))
        ),
    ];

    const participants = participantIds.length
        ? await EventParticipant.find({ _id: { $in: participantIds } })
              .select("skaterApply clubAllow districtAllow stateAllow paymentStatus")
              .lean()
        : [];

    const participantById = new Map(
        participants.map((participant) => [String(participant._id), participant])
    );

    return {
        data: certificates.map((cert) =>
            formatGeneratedCertificateListRow(
                cert,
                participantById.get(String(cert.participantId)) || null
            )
        ),
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: calcTotalPages(total, perPage),
        },
    };
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
    const podiumBySkater = await buildPodiumPlacementsBySkaterForEvent(eventId);
    return podiumBySkater.size > 0;
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
 * Events where (eventEnd + 1 day) < now, competition has 1st/2nd/3rd podium skaters,
 * and not every eligible medal winner already has a generated certificate.
 */
const list_events_for_auto_certificate_generation_repository = async (
    referenceDate = new Date()
) => {
    const eventIdsWithCompetition = await EventCompetition.distinct("eventId");

    if (!eventIdsWithCompetition.length) {
        return { eventsEndedPlusOneDay: 0, events: [] };
    }

    const events = await Event.find({ _id: { $in: eventIdsWithCompetition } })
        .select("_id header eventType eventEndDate eventEndTime")
        .lean();

    const eventsEndedPlusOneDay = events.filter((event) =>
        isEventEndedPlusOneDay(event, referenceDate)
    );

    const pending = [];
    for (const event of eventsEndedPlusOneDay) {
        const hasPodium = await event_has_any_recorded_participant_time_repository(
            event._id
        );
        if (!hasPodium) continue;

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

const summarize_event_certificate_status = async (event) => {
    const eventId = event._id;
    const eligible = await list_eligible_participants_for_event_repository(eventId);
    let generatedCount = 0;

    for (const participant of eligible) {
        const existing = await find_generated_certificate_repository(
            eventId,
            participant._id
        );
        if (existing) {
            generatedCount += 1;
        }
    }

    const eligibleCount = eligible.length;
    const pendingCount = Math.max(eligibleCount - generatedCount, 0);

    const podiumBySkater = await buildPodiumPlacementsBySkaterForEvent(eventId);
    let medalWinnerCount = 0;
    for (const placements of podiumBySkater.values()) {
        medalWinnerCount += placements.length;
    }

    return {
        eventId: String(eventId),
        header: event.header || "",
        eventType: event.eventType || "",
        eventEndDate: event.eventEndDate || null,
        eventEndTime: event.eventEndTime || "",
        eventEnded: true,
        eligibleCount,
        medalWinnerCount,
        generatedCount,
        pendingCount,
        canGenerate: eligibleCount > 0 && pendingCount > 0,
        allGenerated: eligibleCount > 0 && pendingCount === 0,
        requiresPodium:
            "Certificates only for skaters in EventCompetition 1st / 2nd / 3rd (after final update-round).",
    };
};

/**
 * Admin: events whose end datetime is in the past and certificate work may remain.
 */
const list_events_ended_for_admin_certificate_repository = async (
    referenceDate = new Date()
) => {
    const events = await Event.find({
        eventEndDate: { $exists: true, $ne: null },
        status: { $ne: "cancelled" },
    })
        .select("_id header eventType eventEndDate eventEndTime status")
        .sort({ eventEndDate: -1 })
        .lean();

    const ended = events.filter((event) => isEventEnded(event, referenceDate));
    const summaries = [];

    for (const event of ended) {
        summaries.push(await summarize_event_certificate_status(event));
    }

    return {
        totalEnded: summaries.length,
        events: summaries,
    };
};

const get_event_certificate_status_repository = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        return null;
    }

    const event = await Event.findById(eventId)
        .select("_id header eventType eventEndDate eventEndTime status")
        .lean();

    if (!event) {
        return null;
    }

    const summary = await summarize_event_certificate_status(event);
    return {
        ...summary,
        eventEnded: isEventEnded(event),
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
    isEventEnded,
    isEventEndedPlusOneDay,
    list_events_ended_for_admin_certificate_repository,
    get_event_certificate_status_repository,
    list_events_for_auto_certificate_generation_repository,
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
    list_skater_participants_for_certificate_repository,
    list_generated_certificates_by_user_repository,
    get_event_for_certificate_repository,
    get_active_template_for_event_type_repository,
    list_eligible_participants_for_event_repository,
    find_generated_certificate_repository,
    save_generated_certificate_repository,
    build_participant_certificate_payload_repository,
    count_skater_certificate_medal_stats_repository,
};