import {
    countUnreadNotificationRepositories,
    displayAllNotificationRepositories,
    markAllNotificationsReadRepositories,
} from "./notification.repositories.js";

const MAX_NOTIFICATION_PAGE_SIZE = 100;

export const displayAllNotificationServices = async ({ id, page, limit }) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_NOTIFICATION_PAGE_SIZE);
    const safePage = Math.max(Number(page) || 1, 1);

    const result = await displayAllNotificationRepositories({
        id,
        page: safePage,
        limit: safeLimit,
    });

    const unreadCount = await countUnreadNotificationRepositories(id);

    return {
        ...result,
        unreadCount,
    };
};

export const markAllNotificationsReadServices = async ({ id }) => {
    return await markAllNotificationsReadRepositories(id);
};