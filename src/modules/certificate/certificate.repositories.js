import mongoose from "mongoose";
import { CertificateTemplate } from "./certificateTemplate.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { paginate } from "../../util/common/paginate.js";

/** Certificates appear 2 days after the event end date (same rule as skater results). */
const CERTIFICATE_VISIBILITY_MS = 2 * 24 * 60 * 60 * 1000;


/**
 * Create a brand-new certificate template document.
 * The caller is responsible for ensuring a pdfUrl is provided.
 */
const create_template_repository = async (name, pdfUrl, layout) => {
    return await CertificateTemplate.create({ name, pdfUrl, layout, isActive: false });
};

/**
 * Update an existing template by its MongoDB _id.
 * Only updates the fields that are provided (pdfUrl is optional).
 */
const update_template_repository = async (id, { name, pdfUrl, layout }) => {
    const update = { layout };
    if (name !== undefined) update.name = name;
    if (pdfUrl) update.pdfUrl = pdfUrl;

    return await CertificateTemplate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
};

/**
 * Set one template as active and deactivate all others atomically.
 * Used by the "Set as Active" action in the admin UI.
 */
const set_active_template_repository = async (id) => {
    await CertificateTemplate.updateMany({}, { $set: { isActive: false } });
    return await CertificateTemplate.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true });
};

/**
 * Return all templates (lightweight projection for the dropdown list).
 */
const get_all_templates_repository = async () => {
    return await CertificateTemplate.find()
        .select("_id name isActive pdfUrl createdAt")
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

    const data = rows.map((p) => ({
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
    }));

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: Math.ceil(total / perPage) || 0,
        },
    };
};

export {
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
    list_skater_participants_for_certificate_repository,
};