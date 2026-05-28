import { Notification } from "./notification.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";

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
    return Notification.create({
        receiverId: payload.receiverId,
        receiverRole: normalizeNotificationRole(payload.receiverRole),
        title: payload.title,
        body: payload.body,
        link: payload.link || "",
        img: payload.img || "",
        notificationType: normalizeNotificationType(payload.notificationType),
        sentBy: payload.sentBy || null,
        senderRole: payload.senderRole
            ? normalizeNotificationRole(payload.senderRole)
            : null,
        data: payload.data || {},
        isRead: false,
    });
};

export const displayAllNotificationRepositories = async ({ id, page = 1, limit = 20 }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = { receiverId: id };

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
