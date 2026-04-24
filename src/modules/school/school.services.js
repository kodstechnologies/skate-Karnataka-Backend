import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { afterLoginSchoolFormRepositories, displayAllSchoolRepositories, displaySchoolFullDetailsRepositories } from "./school.repositories.js";

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

const displaySchoolFullDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid school id", 400);
    }

    const school = await displaySchoolFullDetailsRepositories(id);
    if (!school) {
        throw new AppError("School not found", 404);
    }
    return school;
}

export {
    afterLoginFormSchoolService,
    displayAllSchoolService,
    displaySchoolFullDetailsService,
}