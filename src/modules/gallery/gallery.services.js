import {
    addMediaREpositories,
    approveMediaByAdminRepositories,
    approveMediaDeleteByAdminRepositories,
    basedOnRoleDisplayRepositories,
    deleteMediaRepositories,
    displayAllMediaBasedOnSkaterRepositories,
    displayAllMediaRepositories,
    displayPendingMediaForAdminRepositories,
    rejectMediaByAdminRepositories,
    rejectMediaDeleteByAdminRepositories,
    requestMediaDeleteRepositories,
    resolveClubOwnerIdRepositories,
    resolveDistrictOwnerIdRepositories,
    updateMediaRepositories,
} from "./gallery.repositories.js";
import {
    canReviewerApproveMediaOwner,
    isAdminRole,
    isStateOrAdminRole,
    MEDIA_ADMIN_APPROVAL,
    MEDIA_DELETE_APPROVAL,
    requiresMediaApproval,
} from "./galleryApprovalPolicy.js";
import { Gallery } from "./gallery.model.js";
import { AppError } from "../../util/common/AppError.js";
import {
    notifyOrgMembersOnMediaDeleteRequested,
    notifyOrgMembersOnMediaDeleteReviewed,
    notifyOrgMembersOnMediaReviewed,
    notifySkatersOnMediaApproved,
    notifyStateLevelOnMediaDeletePending,
    notifyStateLevelOnMediaPendingApproval,
} from "../../util/firebase/galleryNotifications.js";

const ownerTypeMap = {
    admin: "admin",
    club: "club",
    district: "district",
    state: "state",
};

const getOwnerContext = async (user) => {
    const ownerType = ownerTypeMap[String(user?.role || "").toLowerCase()];
    if (!ownerType) {
        throw new AppError("Invalid uploader role for media", 400);
    }

    if (ownerType === "club") {
        const ownerId = await resolveClubOwnerIdRepositories(user);
        return { ownerType, ownerId };
    }

    if (ownerType === "district") {
        const ownerId = await resolveDistrictOwnerIdRepositories(user);
        return { ownerType, ownerId };
    }

    return { ownerType, ownerId: user?._id };
};

const resolveTargetOwner = async (user, data = {}) => {
    const role = String(user?.role || "").toLowerCase();
    const targetOwnerType = String(data?.targetOwnerType || data?.ownerType || "").toLowerCase();
    const targetOwnerId = data?.targetOwnerId || data?.ownerId;

    if (isStateOrAdminRole(role) && targetOwnerType && targetOwnerId) {
        if (!["club", "district", "state", "admin"].includes(targetOwnerType)) {
            throw new AppError("Invalid target owner type for media", 400);
        }
        return { ownerType: targetOwnerType, ownerId: targetOwnerId };
    }

    return getOwnerContext(user);
};

const normalizeSingleUrl = (value) => {
    if (Array.isArray(value)) {
        return value[0] || "";
    }
    return value || "";
};

export const displayAllMediaBasedOnSkaterService = async (skaterId, type, page, limit) => {
    return await displayAllMediaBasedOnSkaterRepositories(skaterId, type, page, limit);
};

export const displayAllMediaServices = async (type, page, limit) => {
    return await displayAllMediaRepositories(type, page, limit);
};

export const displayPendingMediaForAdminService = async (page, limit) => {
    return displayPendingMediaForAdminRepositories(page, limit);
};

export const basedOnRoleDisplayService = async (user, type, page, limit) => {
    const { ownerType, ownerId } = await getOwnerContext(user);
    return await basedOnRoleDisplayRepositories({ ownerType, ownerId, type }, page, limit);
};

export const addMediaService = async (data, user) => {
    const { ownerType, ownerId } = await resolveTargetOwner(user, data);

    const created = await addMediaREpositories({
        ...data,
        ownerType,
        ownerId,
        uploadedBy: user?._id || null,
        uploaderRole: user?.role,
    });

    if (requiresMediaApproval(ownerType)) {
        notifyStateLevelOnMediaPendingApproval({
            media: created,
            sentBy: user?._id,
        }).catch((err) => {
            console.error("Media pending-approval notification failed:", err?.message || err);
        });
    }

    const message = requiresMediaApproval(ownerType)
        ? "Media submitted — pending super admin approval before skaters can see it"
        : "Media added successfully";

    return { media: created, message };
};

export const updateMediaService = async (id, data, user) => {
    const { ownerType, ownerId } = await getOwnerContext(user);
    const accessFilter = isStateOrAdminRole(ownerType)
        ? {}
        : { ownerType, ownerId };

    const payload = {};
    if (typeof data?.img !== "undefined" || typeof data?.imageUrl !== "undefined") {
        payload.imageUrl = normalizeSingleUrl(data?.imageUrl ?? data?.img);
    }
    if (typeof data?.videoUrl !== "undefined" || typeof data?.video !== "undefined") {
        payload.videoUrl = normalizeSingleUrl(data?.videoUrl ?? data?.video);
    }
    if (typeof data?.title !== "undefined") {
        payload.title = data.title || "";
    }
    if (typeof data?.about !== "undefined") {
        payload.about = data.about || "";
    }

    if (requiresMediaApproval(ownerType)) {
        const existing = await Gallery.findOne({ _id: id, ...accessFilter }).lean();
        if (existing?.adminApprovalStatus === MEDIA_ADMIN_APPROVAL.REJECTED) {
            payload.adminApprovalStatus = MEDIA_ADMIN_APPROVAL.PENDING;
        }
    }

    if (!Object.keys(payload).length) {
        throw new AppError("No fields provided to update", 400);
    }

    const updated = await updateMediaRepositories(id, payload, accessFilter);
    if (!updated) {
        throw new AppError("Media not found or access denied", 404);
    }
    return updated;
};

export const deleteMediaService = async (id, user) => {
    const { ownerType, ownerId } = await getOwnerContext(user);
    const role = String(user?.role || "").toLowerCase();
    const accessFilter = isStateOrAdminRole(role)
        ? {}
        : { ownerType, ownerId };

    const existing = await Gallery.findOne({ _id: id, ...accessFilter }).lean();
    if (!existing) {
        throw new AppError("Media not found or access denied", 404);
    }

    if (existing.deleteApprovalStatus === MEDIA_DELETE_APPROVAL.PENDING) {
        throw new AppError("Delete request is already pending admin approval", 400);
    }

    if (!isAdminRole(role)) {
        const pending = await requestMediaDeleteRepositories(id, accessFilter);
        if (!pending) {
            throw new AppError("Media not found or access denied", 404);
        }

        notifyStateLevelOnMediaDeletePending({
            media: pending,
            sentBy: user?._id,
        }).catch((err) => {
            console.error("Media delete-pending notification failed:", err?.message || err);
        });
        notifyOrgMembersOnMediaDeleteRequested({
            media: pending,
            sentBy: user?._id,
        }).catch((err) => {
            console.error("Media delete-request org notification failed:", err?.message || err);
        });

        return {
            deleted: false,
            pendingDelete: true,
            message: "Delete request submitted for admin approval",
        };
    }

    const deleted = await deleteMediaRepositories(id, accessFilter);
    if (!deleted) {
        throw new AppError("Media not found or access denied", 404);
    }
    return { deleted: true, pendingDelete: false, message: "Media deleted successfully" };
};

export const approveMediaByAdminService = async (id, reviewerId, reviewerRole) => {
    const existing = await Gallery.findById(id).select("ownerType").lean();
    if (!existing) {
        throw new AppError("Media not found", 404);
    }
    if (!canReviewerApproveMediaOwner(existing.ownerType, reviewerRole)) {
        throw new AppError("Forbidden", 403);
    }

    const updated = await approveMediaByAdminRepositories(id);
    if (!updated) {
        throw new AppError("Media not found", 404);
    }

    notifyOrgMembersOnMediaReviewed({
        media: updated,
        sentBy: reviewerId,
        approved: true,
    }).catch((err) => {
        console.error("Media approved org notification failed:", err?.message || err);
    });
    notifySkatersOnMediaApproved({
        media: updated,
        sentBy: reviewerId,
    }).catch((err) => {
        console.error("Media approved skater notification failed:", err?.message || err);
    });

    return updated;
};

export const rejectMediaByAdminService = async (id, reviewerId, reviewerRole) => {
    const existing = await Gallery.findById(id).select("ownerType").lean();
    if (!existing) {
        throw new AppError("Media not found", 404);
    }
    if (!canReviewerApproveMediaOwner(existing.ownerType, reviewerRole)) {
        throw new AppError("Forbidden", 403);
    }

    const updated = await rejectMediaByAdminRepositories(id);
    if (!updated) {
        throw new AppError("Media not found", 404);
    }

    notifyOrgMembersOnMediaReviewed({
        media: updated,
        sentBy: reviewerId,
        approved: false,
    }).catch((err) => {
        console.error("Media rejected org notification failed:", err?.message || err);
    });

    return updated;
};

export const approveMediaDeleteByAdminService = async (id, reviewerId) => {
    const existing = await Gallery.findById(id).lean();
    if (!existing) {
        throw new AppError("Media not found", 404);
    }

    const result = await approveMediaDeleteByAdminRepositories(id);

    notifyOrgMembersOnMediaDeleteReviewed({
        media: existing,
        sentBy: reviewerId,
        deleted: true,
    }).catch((err) => {
        console.error("Media delete-approved org notification failed:", err?.message || err);
    });

    return result;
};

export const rejectMediaDeleteByAdminService = async (id, reviewerId) => {
    const updated = await rejectMediaDeleteByAdminRepositories(id);
    if (!updated) {
        throw new AppError("Media not found", 404);
    }

    notifyOrgMembersOnMediaDeleteReviewed({
        media: updated,
        sentBy: reviewerId,
        deleted: false,
    }).catch((err) => {
        console.error("Media delete-rejected org notification failed:", err?.message || err);
    });

    return updated;
};
