import { addMediaREpositories, displayAllMediaBasedOnSkaterRepositories } from "./gallery.repositories.js";
import { AppError } from "../../util/common/AppError.js";

export const displayAllMediaBasedOnSkaterService = async (skaterId) => {
    return await displayAllMediaBasedOnSkaterRepositories(skaterId);
}

export const addMediaService = async (data, user) => {
    const ownerTypeMap = {
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