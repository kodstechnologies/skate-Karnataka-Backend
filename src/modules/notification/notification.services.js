import { displayAllNotificationRepositories } from "./notification.repositories.js";

export const displayAllNotificationServices = async ({ id, page, limit }) => {
    return await displayAllNotificationRepositories({ id, page, limit });
}