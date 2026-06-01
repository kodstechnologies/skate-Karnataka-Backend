import { asyncHandler } from "../../util/common/asyncHandler.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import {
    displayAllNotificationServices,
    markAllNotificationsReadServices,
} from "./notification.services.js";

export const displayAllNotification = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const { page, limit } = req.query;
    const result = await displayAllNotificationServices({
        id,
        page: Number(page ?? 1),
        limit: Number(limit ?? 20),
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "All notification display successfully"
        )
    );
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const result = await markAllNotificationsReadServices({ id: req.user._id });
    return res.status(200).json(
        new ApiResponse(200, result, "All notifications marked as read")
    );
});

