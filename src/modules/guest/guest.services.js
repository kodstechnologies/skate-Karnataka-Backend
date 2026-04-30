import {
  addContactUsRepositories,
  addFeedBackRepositories,
  addNewsRepositories,
  deleteNewsRepositories,
  afterLoginGuestFormRepositories,
  displayContactUsRepositories,
  displayFeedbackRepositories,
  displayNewsRepositories,
  displayStateLatestEventsRepositories,
  displayStateLatestSingleEventsRepositories,
  displaySingleNewsRepositories,
  updateNewsRepositories,
} from "./guest.repositories.js";
import { AppError } from "../../util/common/AppError.js";
export const afterLoginFormGuestService = async (data, id) => {
    await afterLoginGuestFormRepositories(data, id);
}

export const displayContactUsService = async () => {
    return await displayContactUsRepositories()
}

export const addContactUsService = async (data) => {
    console.log(data,"====")
    await addContactUsRepositories(data)
}

export const displayFeedbackService = async ({ page, limit }) => {
    return displayFeedbackRepositories({ page, limit });
};

export const addFeedBackService = async (data) => {
    await addFeedBackRepositories(data);
};

export const displayNewsService = async ({ page, limit }) => {
    return displayNewsRepositories({ page, limit });
};

export const addNewsService = async (data) => {
    await addNewsRepositories(data);
};

export const displaySingleNewsService = async (id) => {
    const news = await displaySingleNewsRepositories(id);
    if (!news) {
        throw new AppError("News not found", 404);
    }
    return news;
};

export const updateNewsService = async (id, data) => {
    const updated = await updateNewsRepositories(id, data);
    if (!updated) {
        throw new AppError("News not found", 404);
    }
    return updated;
};

export const deleteNewsService = async (id) => {
    const deleted = await deleteNewsRepositories(id);
    if (!deleted) {
        throw new AppError("News not found", 404);
    }
    return { deleted: true };
};

export const displayStateLatestEventsService = async ({ page, limit }) => {
    return displayStateLatestEventsRepositories({ page, limit });
};

export const displayStateLatestSingleEventsService = async (id) => {
    const event = await displayStateLatestSingleEventsRepositories(id);
    if (!event) {
        throw new AppError("State event not found", 404);
    }
    return event;
};