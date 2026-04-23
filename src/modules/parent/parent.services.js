import { afterLoginParentFormRepositories, displayAllParentRepositories } from "./parent.repositories.js";

const afterLoginFormParentService = async (data, id) => {
    await afterLoginParentFormRepositories(data, id);

}

const displayAllParentService = async (query) => {
    const { page = 1, limit = 10, search = "" } = query;
    return await displayAllParentRepositories({ page, limit, search });
}



export {
    afterLoginFormParentService,
    displayAllParentService,
}