
import { afterLoginOfficialFormRepositories, displayAllOfficialRepositories } from "./official.repositories.js";

const afterLoginFormOfficialService = async (data, id) => {
     await afterLoginOfficialFormRepositories(data, id); 
}

const displayAllOfficialService = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        fullName = "",
        phone = "",
        address = "",
        district = "",
        gender = "",
        email = "",
    } = query;
    return await displayAllOfficialRepositories({
        page,
        limit,
        search,
        fullName,
        phone,
        address,
        district,
        gender,
        email,
    });
}

export {
    afterLoginFormOfficialService,
    displayAllOfficialService,
}