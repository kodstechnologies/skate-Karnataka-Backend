import { afterLoginSchoolFormRepositories, displayAllSchoolRepositories } from "./school.repositories.js";

const afterLoginFormSchoolService = async (data, id) => {
    await afterLoginSchoolFormRepositories(data, id);

}

const displayAllSchoolService = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        email = "",
        gender = "",
        address = "",
        phone = "",
        fullName = "",
    } = query;
    return await displayAllSchoolRepositories({
        page,
        limit,
        search,
        email,
        gender,
        address,
        phone,
        fullName,
    });
}

export {
    afterLoginFormSchoolService,
    displayAllSchoolService,
}