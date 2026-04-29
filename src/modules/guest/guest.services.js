import { asyncHandler } from "../../util/common/asyncHandler.js";
import { addContactUsRepositories, afterLoginGuestFormRepositories, displayContactUsRepositories } from "./guest.repositories.js";
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