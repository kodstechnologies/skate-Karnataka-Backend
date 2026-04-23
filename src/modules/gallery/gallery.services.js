import {
    addMediaREpositories,
    deleteMediaRepositories,
    displayAllMediaBasedOnSkaterRepositories,
    displayAllMediaRepositories,
    updateMediaRepositories,
} from "./gallery.repositories.js";
import { AppError } from "../../util/common/AppError.js";

const ownerTypeMap = {
    admin: "admin",
    club: "club",
    district: "district",
    state: "state",
};

const getOwnerContext = (user) => {
    const ownerType = ownerTypeMap[String(user?.role || "").toLowerCase()];
    if (!ownerType) {
        throw new AppError("Invalid uploader role for media", 400);
    }
    return { ownerType, ownerId: user?._id };
};

export const displayAllMediaBasedOnSkaterService = async (skaterId, page, limit) => {
    return await displayAllMediaBasedOnSkaterRepositories(skaterId, page, limit);
}

export const displayAllMediaServices = async (type, page, limit) => {
    return await displayAllMediaRepositories(type, page, limit);
}

export const addMediaService = async (data, user) => {
    const { ownerType, ownerId } = getOwnerContext(user);

    await addMediaREpositories({
        ...data,
        ownerType,
        ownerId,
    });
};

export const updateMediaService = async (id, data, user) => {
    const { ownerType, ownerId } = getOwnerContext(user);
    const accessFilter = ["admin", "state"].includes(ownerType)
        ? {}
        : { ownerType, ownerId };

    const payload = {};
    if (typeof data?.img !== "undefined" || typeof data?.imageUrl !== "undefined") {
        payload.imageUrl = data?.img || data?.imageUrl || "";
    }
    if (typeof data?.videoUrl !== "undefined") {
        payload.videoUrl = data.videoUrl || "";
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
    const { ownerType, ownerId } = getOwnerContext(user);
    const accessFilter = ["admin", "state"].includes(ownerType)
        ? {}
        : { ownerType, ownerId };

    const deleted = await deleteMediaRepositories(id, accessFilter);
    if (!deleted) {
        throw new AppError("Media not found or access denied", 404);
    }
    return deleted;
};