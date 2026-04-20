import {afterLoginGuestFormRepositories} from "./guest.repositories.js";
const afterLoginFormGuestService = async (data, id) => {
    await afterLoginGuestFormRepositories(data, id);
}

export {
    afterLoginFormGuestService
}