import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { afterLoginOfficialFormRepositories, displayAllOfficialRepositories, displayOfficialfullDetailsRepositories } from "./official.repositories.js";

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

const displayOfficialfullDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid official id", 400);
    }

    const official = await displayOfficialfullDetailsRepositories(id);
    if (!official) {
        throw new AppError("Official not found", 404);
    }
    return official;
}

export {
    afterLoginFormOfficialService,
    displayAllOfficialService,
    displayOfficialfullDetailsService,
}