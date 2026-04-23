import { afterLoginParentFormRepositories, displayAllParentRepositories } from "./parent.repositories.js";

const afterLoginFormParentService = async (data, id) => {
    await afterLoginParentFormRepositories(data, id);

}

const displayAllParentService = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        fullName = "",
        phone = "",
        gender = "",
        email = "",
    } = query;
    return await displayAllParentRepositories({ page, limit, search, fullName, phone, gender, email });
}



export {
    afterLoginFormParentService,
    displayAllParentService,
}