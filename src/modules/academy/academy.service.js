import { AppError } from "../../util/common/AppError.js";
import {
    afterLoginClubFormRepositories,
    displayAllAcademyRepositories,
    displayFullDetailsOfAcademyRepositories,
} from "./academy.repositories.js";
import mongoose from "mongoose";
import { sendClubProfileSubmittedEmail } from "../../util/email/clubProfileEmail.js";

// ==============================================
const afterLoginFormClubService = async (data, id) => {
    const profile = await afterLoginClubFormRepositories(data, id);

    let emailSent = false;
    if (profile?.email) {
        try {
            emailSent = await sendClubProfileSubmittedEmail(profile);
        } catch (err) {
            console.error("Club profile submitted email failed:", err?.message || err);
        }
    }

    return {
        _id: profile?._id,
        verify: profile?.verify === true,
        krsaId: profile?.krsaId || "",
        clubName: profile?.clubName || "",
        fullName: profile?.fullName || "",
        email: profile?.email || "",
        emailSent,
    };
};

const displayAllAcademyService = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        fullName = "",
        phone = "",
        address = "",
        gender = "",
        email = "",
        district = "",
    } = query;
    return await displayAllAcademyRepositories({
        page,
        limit,
        search,
        fullName,
        phone,
        address,
        gender,
        email,
        district,
    });
}

const displayFullDetailsOfAcademyService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid academy id", 400);
    }

    const academy = await displayFullDetailsOfAcademyRepositories(id);
    if (!academy) {
        throw new AppError("Academy not found", 404);
    }
    return academy;
}

export {
afterLoginFormClubService,
displayAllAcademyService,
displayFullDetailsOfAcademyService,
}