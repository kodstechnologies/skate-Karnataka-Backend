import { AppError } from "../../util/common/AppError.js";
import { State } from "../state/state.model.js";
import { createEventCategoryRepository, deleteEventCategoryRepository, displaySingleEventRepository, displayAllEventRepository, create_event_repositories, edit_event_repositories, delete_event_repositories, display_latest_event_repositories, display_all_event_based_on_user_repositories, clubRelatedEventDisplayRepositories, createClubEventRepositories, districtRelatedEventDisplayRepositories, createDistrictEventRepositories, stateRelatedEventDisplayRepositories, createStateEventRepositories, getAllEventCategoriesRepository, getEventCategoryByIdRepository, updateEventCategoryRepository } from "./event.repositories.js";

const displayEventServer = async (data) => {

    const { page, limit } = data;

    const result = await displayAllEventRepository({
        page,
        limit
    });

    if (!result || result.data.length === 0) {
        throw new AppError("No events found", 404);
    }

    return result;
};

export const clubRelatedEventDisplayService = async (clubId, query) =>{
    return await clubRelatedEventDisplayRepositories(clubId, query);
}

export const createClubEventService = async (clubId, data) => {
    return await createClubEventRepositories(clubId, data);
}

export const districtRelatedEventDisplayService = async (districtUserId, query) => {
    return await districtRelatedEventDisplayRepositories(districtUserId, query);
}

export const createDistrictEventService = async (districtUserId, data) => {
    return await createDistrictEventRepositories(districtUserId, data);
}

export const stateRelatedEventDisplayService = async (stateId, query) => {
    return await stateRelatedEventDisplayRepositories(stateId, query);
}

export const createStateEventService = async (stateId, data) => {
    let resolvedStateId = stateId;

    if (resolvedStateId) {
        const state = await State.findById(resolvedStateId).select("_id").lean();
        if (state) {
            return await createStateEventRepositories(resolvedStateId, data);
        }
    }

    const fallbackState = await State.findOne().sort({ createdAt: 1 }).select("_id").lean();
    if (!fallbackState) {
        throw new AppError("No state found to create state event", 404);
    }

    resolvedStateId = fallbackState._id;
    return await createStateEventRepositories(resolvedStateId, data);
};

export const getAllEventCategoriesService = async (query) => {
    return await getAllEventCategoriesRepository(query);
};

export const getEventCategoryByIdService = async (id) => {
    const category = await getEventCategoryByIdRepository(id);
    if (!category) {
        throw new AppError("Event category not found", 404);
    }
    return category;
};

export const createEventCategoryService = async (payload) => {
    return await createEventCategoryRepository(payload);
};

export const updateEventCategoryService = async (id, payload) => {
    const updated = await updateEventCategoryRepository(id, payload);
    if (!updated) {
        throw new AppError("Event category not found", 404);
    }
    return updated;
};

export const deleteEventCategoryService = async (id) => {
    const deleted = await deleteEventCategoryRepository(id);
    if (!deleted) {
        throw new AppError("Event category not found", 404);
    }
    return deleted;
};

const displaySingleEventDetailsServer = async (id) => {
    return await displaySingleEventRepository(id);
}

const display_latest_event_server = async (id) => {
    return await display_latest_event_repositories(id);
}

const create_event_schema = async (data) => {
    await create_event_repositories(data);
}

const edit_event_schema = async (id, data) => {
    await edit_event_repositories(id, data);
}

const delete_event_schema = async (id) => {
    await delete_event_repositories(id);
}

const display_all_event_based_on_user_service = async (id, query) => {
  return await display_all_event_based_on_user_repositories(id, query);
}

export {
    displayEventServer,
    displaySingleEventDetailsServer,
    display_latest_event_server,
    create_event_schema,
    edit_event_schema,
    delete_event_schema,
    display_all_event_based_on_user_service
};
