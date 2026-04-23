import {
    addMediaREpositories,
    displayAllMediaBasedOnSkaterRepositories,
    displayAllMediaRepositories,
} from "./gallery.repositories.js";
import { AppError } from "../../util/common/AppError.js";

export const displayAllMediaBasedOnSkaterService = async (skaterId, page, limit) => {
    return await displayAllMediaBasedOnSkaterRepositories(skaterId, page, limit);
}

export const displayAllMediaServices = async (type, page, limit) => {
    return await displayAllMediaRepositories(type, page, limit);
}

export const addMediaService = async (data, user) => {
    const ownerTypeMap = {
        Admin: "admin",
        Club: "club",
        District: "district",
        State: "state",
    };

    const ownerType = ownerTypeMap[user?.role];
    if (!ownerType) {
        throw new AppError("Invalid uploader role for media", 400);
    }

    await addMediaREpositories({
        ...data,
        ownerType,
        ownerId: user?._id,
    });
}