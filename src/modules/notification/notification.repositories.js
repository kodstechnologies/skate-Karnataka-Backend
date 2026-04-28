import { Notification } from "./notification.model.js"
import { paginate } from "../../util/common/paginate.js";

export const displayAllNotificationRepositories = async ({ id, page = 1, limit = 20 }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = { receiverId: id };

    const [total, notifications] = await Promise.all([
        Notification.countDocuments(query),
        Notification.find(query)
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
            totalPages: Math.ceil(total / perPage),
        },
    };
}