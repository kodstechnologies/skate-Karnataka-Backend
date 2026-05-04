import {
  addContactUsRepositories,
  addFeedBackRepositories,
  addNewsRepositories,
  addAboutRepositories,
  addCircularRepositories,
  addDisciplineRepositories,
  deleteAllAboutRepositories,
  deleteCircularRepositories,
  deleteNewsRepositories,
  deleteDisciplineRepositories,
  afterLoginGuestFormRepositories,
  displayAboutGuestRepositories,
  displayCircularRepositories,
  displayLatestAboutRepositories,
  displaySingleCircularRepositories,
  displayContactUsRepositories,
  displayDisciplinesRepositories,
  displaySingleDisciplineRepositories,
  displayFeedbackRepositories,
  displayNewsRepositories,
  displayStateLatestEventsRepositories,
  displayStateLatestSingleEventsRepositories,
  displaySingleNewsRepositories,
  updateLatestAboutRepositories,
  updateCircularRepositories,
  updateDisciplineRepositories,
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

export const displayNewsService = async ({ page, limit, search }) => {
    return displayNewsRepositories({ page, limit, search });
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

export const displayDisciplinesService = async ({ page, limit }) => {
    return displayDisciplinesRepositories({ page, limit });
};

export const displaySingleDisciplineService = async (id) => {
    const discipline = await displaySingleDisciplineRepositories(id);
    if (!discipline) {
        throw new AppError("Discipline not found", 404);
    }
    return discipline;
};

export const addDisciplineService = async (data) => {
    await addDisciplineRepositories(data);
};

export const updateDisciplineService = async (id, data) => {
    const updated = await updateDisciplineRepositories(id, data);
    if (!updated) {
        throw new AppError("Discipline not found", 404);
    }
    return updated;
};

export const deleteDisciplineService = async (id) => {
    const deleted = await deleteDisciplineRepositories(id);
    if (!deleted) {
        throw new AppError("Discipline not found", 404);
    }
    return { deleted: true };
};

export const displayCircularService = async ({ page, limit }) => {
    return displayCircularRepositories({ page, limit });
};

export const displaySingleCircularService = async (id) => {
    const circular = await displaySingleCircularRepositories(id);
    if (!circular) {
        throw new AppError("Circular not found", 404);
    }
    return circular;
};

export const addCircularService = async (data) => {
    await addCircularRepositories(data);
};

export const updateCircularService = async (id, data) => {
    const updated = await updateCircularRepositories(id, data);
    if (!updated) {
        throw new AppError("Circular not found", 404);
    }
    return updated;
};

export const deleteCircularService = async (id) => {
    const deleted = await deleteCircularRepositories(id);
    if (!deleted) {
        throw new AppError("Circular not found", 404);
    }
    return { deleted: true };
};

export const displayLatestAboutService = async () => {
    return displayLatestAboutRepositories();
};

export const displayAboutGuestService = async () => {
    return displayAboutGuestRepositories();
};

export const addAboutService = async (data) => {
    await deleteAllAboutRepositories();
    await addAboutRepositories(data);
};

export const updateAboutService = async (data) => {
    const updated = await updateLatestAboutRepositories(data);
    if (!updated) {
        throw new AppError("About not found", 404);
    }
    return updated;
};

export const deleteAboutService = async () => {
    return deleteAllAboutRepositories();
};