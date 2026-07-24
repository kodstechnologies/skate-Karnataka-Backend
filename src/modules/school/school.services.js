import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import {
    afterLoginSchoolFormRepositories,
    deleteSchoolByIdRepositories,
    displayAllSchoolRepositories,
    displaySchoolFullDetailsRepositories,
} from "./school.repositories.js";
import { sendSchoolProfileSubmittedEmail } from "../../util/email/schoolProfileEmail.js";

const afterLoginFormSchoolService = async (data, id) => {
    const profile = await afterLoginSchoolFormRepositories(data, id);

    let emailSent = false;
    if (profile?.email || profile?.schoolEmail) {
        try {
            emailSent = await sendSchoolProfileSubmittedEmail(profile, {
                submittedImg: data.img,
                submittedDocuments: data.documents,
            });
        } catch (err) {
            console.error("School profile submitted email failed:", err?.message || err);
        }
    }

    return {
        krsaId: profile?.krsaId || "",
        schoolName: profile?.schoolName || "",
        fullName: profile?.fullName || "",
        email: profile?.email || profile?.schoolEmail || "",
        emailSent,
    };
};

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
};

const displaySchoolFullDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid school id", 400);
    }

    const school = await displaySchoolFullDetailsRepositories(id);
    if (!school) {
        throw new AppError("School not found", 404);
    }
    return school;
};

const deleteSchoolService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid school id", 400);
    }

    const deleted = await deleteSchoolByIdRepositories(id);
    if (!deleted) {
        throw new AppError("School not found", 404);
    }

    return { deleted: true };
};

export {
    afterLoginFormSchoolService,
    displayAllSchoolService,
    displaySchoolFullDetailsService,
    deleteSchoolService,
};