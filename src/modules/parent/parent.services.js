import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { afterLoginParentFormRepositories, displayAllParentRepositories, displayParentFullDetailsRepositories } from "./parent.repositories.js";

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

const displayParentFullDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid parent id", 400);
    }
    const parent = await displayParentFullDetailsRepositories(id);
    if (!parent) {
        throw new AppError("Parent not found", 404);
    }
    return parent;
}



export {
    afterLoginFormParentService,
    displayAllParentService,
    displayParentFullDetailsService,
}