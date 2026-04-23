import { afterLoginClubFormRepositories, displayAllAcademyRepositories } from "./academy.repositories.js";

// ==============================================
const afterLoginFormClubService = async (data, id) => {
    // console.log(data, "---")
    await afterLoginClubFormRepositories(data, id);
}

const displayAllAcademyService = async (query) => {
    const { page = 1, limit = 10 } = query;
    return await displayAllAcademyRepositories({ page, limit });
}

export {
afterLoginFormClubService,
displayAllAcademyService,
}