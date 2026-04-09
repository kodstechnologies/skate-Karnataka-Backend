import { AppError } from "../../util/common/AppError.js";
import { displaySingleEventRepository, displayAllEventRepository, create_event_repositories, edit_event_repositories, delete_event_repositories, display_latest_event_repositories } from "./event.repositories.js";

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


const displaySingleEventDetailsServer = async (data) => {
    return await displaySingleEventRepository(data);
}

const display_latest_event_server = async () => {
return await display_latest_event_repositories();
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

const display_all_event_based_on_user_service = async () => {

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
