import { afterLoginClubFormRepositories } from "./academy.repositories.js";

// ==============================================
const afterLoginFormClubService = async (data, id) => {
    // console.log(data, "---")
    await afterLoginClubFormRepositories(data, id);
}

export {
afterLoginFormClubService,
}