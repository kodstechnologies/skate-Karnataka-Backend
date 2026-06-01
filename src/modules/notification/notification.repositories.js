import { Notification } from "./notification.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";
import mongoose from "mongoose";

/** Roles that receive state-level alerts (state portal + super admin). */
export const STATE_LEVEL_RECEIVER_ROLES = ["State", "admin"];

export const getStateLevelRecipientIds = async () => {
    const users = await BaseAuth.find({
        role: { $in: STATE_LEVEL_RECEIVER_ROLES },
        isActive: true,
        isNotificationsEnabled: { $ne: false },
    })
        .select("_id")
        .lean();

    return users.map((user) => String(user._id));
};

const ALLOWED_NOTIFICATION_TYPES = new Set([
    "report",
    "approval",
    "event",
    "competition",
    "message",
    "announcement",
    "general",
]);

const ROLE_MAP = {
    skater: "Skater",
    parent: "Parent",
    school: "School",
    academy: "Academy",
    scademy: "Scademy",
    state: "State",
    official: "Official",
    admin: "Admin",
    guest: "Guest",
    club: "Club",
    district: "District",
};

export const normalizeNotificationRole = (role) => {
    const raw = String(role || "").trim();
    if (!raw) return "Guest";
    if (ROLE_MAP[raw.toLowerCase()]) {
        return ROLE_MAP[raw.toLowerCase()];
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const normalizeNotificationType = (type) => {
    const normalized = String(type || "general").trim().toLowerCase();
    return ALLOWED_NOTIFICATION_TYPES.has(normalized) ? normalized : "general";
};

export const saveNotificationRepositories = async (payload) => {
    const receiverId = mongoose.Types.ObjectId.isValid(String(payload.receiverId || ""))
        ? new mongoose.Types.ObjectId(String(payload.receiverId))
        : payload.receiverId;

    const sentBy = payload.sentBy && mongoose.Types.ObjectId.isValid(String(payload.sentBy))
        ? new mongoose.Types.ObjectId(String(payload.sentBy))
        : payload.sentBy || null;

    return Notification.create({
        receiverId,
        receiverRole: normalizeNotificationRole(payload.receiverRole),
        title: payload.title,
        body: payload.body,
        link: payload.link || "",
        img: payload.img || "",
        notificationType: normalizeNotificationType(payload.notificationType),
        sentBy,
        senderRole: payload.senderRole
            ? normalizeNotificationRole(payload.senderRole)
            : null,
        data: payload.data || {},
        isRead: false,
    });
};

export const displayAllNotificationRepositories = async ({ id, page = 1, limit = 20 }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const rawId = String(id || "").trim();
    const receiverObjectId = mongoose.Types.ObjectId.isValid(rawId)
        ? new mongoose.Types.ObjectId(rawId)
        : id;

    const query = {
        receiverId: { $in: [receiverObjectId, rawId] },
    };

    const [total, notifications] = await Promise.all([
        Notification.countDocuments(query),
        Notification.find(query)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean(),
    ]);

    return {
        notifications,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: calcTotalPages(total, perPage),
        },
    };
};

const toReceiverObjectId = (id) => {
    const rawId = String(id || "").trim();
    if (!rawId) return null;
    return mongoose.Types.ObjectId.isValid(rawId)
        ? new mongoose.Types.ObjectId(rawId)
        : id;
};

export const countUnreadNotificationRepositories = async (id) => {
    const receiverObjectId = toReceiverObjectId(id);
    if (!receiverObjectId) return 0;

    return Notification.countDocuments({
        receiverId: receiverObjectId,
        isRead: false,
    });
};

export const markAllNotificationsReadRepositories = async (id) => {
    const receiverObjectId = toReceiverObjectId(id);
    if (!receiverObjectId) {
        return { modifiedCount: 0 };
    }

    const result = await Notification.updateMany(
        { receiverId: receiverObjectId, isRead: false },
        { $set: { isRead: true } }
    );

    return { modifiedCount: result.modifiedCount ?? 0 };
};
