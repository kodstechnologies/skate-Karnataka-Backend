import { AppError } from "../../util/common/AppError.js";
import { addSkaterByClubRepository, affiliatedDistrictRepository, allClubsInDbRepository, allClubsRepository, apply_club_repositories, apply_leave_repository, applyForDistrictRepository, approve_join_club_repositories, approve_leave_club_repositories, clubIdStoreinDestrict, clubsForSkaterUserRepository, createClubRepository, deleteClubDetails, display_all_apply_skater_repositories, display_all_club_skater_repositories, display_club_skater_details_repositories, display_existing_club_repositories, displayClubDashboardRepositories, displayClubProfileRepositories, displayDistrictFullDetailsRepository, displayFullDetailsOfClub, exceptOwnDistrictDisplayAllDistrictRepository, isAlreadyAppliedToClubRepository, isApplyRepository, isExistClub, isThisClubExist, reject_join_club_repositories, remove_skater_from_club_repositories, removeAffiliationRepository, updateClubDetails } from "./club.repositories.js";


const mapCreateClubError = (error) => {
    if (error instanceof AppError) {
        return error;
    }

    if (error?.code === 11000) {
        const kp = error.keyPattern || {};
        if (kp.phone) {
            return new AppError("This phone number is already registered", 409);
        }
        if (kp.email) {
            return new AppError("This email is already in use", 409);
        }
        if (kp.name && kp.district) {
            return new AppError("Club name already exists in this district", 409);
        }
        if (kp.krsaId) {
            return new AppError("Could not assign a unique KRSA ID, please try again", 409);
        }
        return new AppError("A record with these details already exists", 409);
    }

    if (error?.name === "ValidationError") {
        const parts = Object.values(error.errors || {}).map((e) => e.message);
        const msg = parts.length ? parts.join("; ") : "Invalid club data";
        return new AppError(msg, 400);
    }

    if (error?.name === "CastError") {
        return new AppError("Invalid district id or data format", 400);
    }

    return new AppError(error?.message || "Failed to create club", 400);
};

export const displayClubDashboardService = async(clubId) => {
    return await displayClubDashboardRepositories({ clubId });
}

export const displayClubProfileService = async (userId) => {
    const profile = await displayClubProfileRepositories(userId);

    if (!profile) {
        throw new AppError("Club profile not found", 404);
    }

    return profile;
};

export const affiliatedDistrictService = async (clubMemberId) => {
    return await affiliatedDistrictRepository(clubMemberId);
};

export const exceptOwnDistrictDisplayAllDistrictService = async (clubId) => {
    const districts = await exceptOwnDistrictDisplayAllDistrictRepository(clubId);
    if (districts === null) {
        throw new AppError("Club not found", 404);
    }
    return districts;
};

export const displayDistrictFullDetailsService = async (districtId) => {
    const district = await displayDistrictFullDetailsRepository(districtId);
    if (!district) {
        throw new AppError("District not found", 404);
    }
    return district;
};

export const applyForDistrictService = async (clubId, districtId) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }
    const result = await applyForDistrictRepository(clubId, districtId);
    if (!result) {
        throw new AppError("Club not found", 404);
    }
    return result;
};

export const removeAffiliationService = async (clubId) => {
    const result = await removeAffiliationRepository(clubId);
    if (!result) {
        throw new AppError("Club not found", 404);
    }
    return result;
};

export const pendingApprovalsServices = async (clubMemberId, { page, limit } = {}) => {
    return await display_all_apply_skater_repositories(clubMemberId, { page, limit });
};
export const reportServices = async(clubId) =>{
return await reportRepositories({clubId})
}

const allClubService = async (id, page, limit) => {
    return await allClubsRepository(id, page, limit);
}

const allClubsInDbService = async ({ page, limit, search }) => {
    return await allClubsInDbRepository({ page, limit, search });
}

const createClubService = async (data) => {
    const { name, district } = data;
    const isExist = await isExistClub(name, district);
    if (isExist) {
        throw new AppError(
            "Club name already exists in this district",
            409
        );
    }

    try {
        const clubData = await createClubRepository(data);   //  create
        await clubIdStoreinDestrict(clubData.district, clubData._id);
    } catch (error) {
        throw mapCreateClubError(error);
    }
};

const displaySingleClubService = async (id) => {
    const isExistClub = await isThisClubExist(id)
    if (!isExistClub) {
        throw new AppError("This Club is currently not available", 404)
    }
    return await displayFullDetailsOfClub(id);
}

const updateClubDetailsService = async (data, id) => {
    try {
        await updateClubDetails(data, id);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        if (error?.code === 11000) {
            throw new AppError("Club name already exists in this district", 409);
        }
        if (error?.name === "ValidationError") {
            const parts = Object.values(error.errors || {}).map((e) => e.message);
            throw new AppError(parts.length ? parts.join("; ") : "Invalid club data", 400);
        }
        throw new AppError(error?.message || "Failed to update club", 400);
    }
}

const deleteClubSchema = async (id) => {
    await deleteClubDetails(id);
}

const clubsByUserDistrictService = async (user, { page, limit }) => {
    const userId = user?._id || user?.id;
    if (!userId) {
        throw new AppError("User not authenticated", 401);
    }
    return await clubsForSkaterUserRepository(userId, { page, limit });
};

const apply_club_service = async (clubId, userID) => {
    const status = await isApplyRepository(userID);
    const blockedStatuses = {
        join: "Already joined a club",
        "apply-leave": "Leave request is in progress",
    };

    const alreadyAppliedToThisClub = await isAlreadyAppliedToClubRepository(userID, clubId);
    if (alreadyAppliedToThisClub) {
        throw new AppError("Already applied", 400);
    }

    if (blockedStatuses[status]) {
        throw new AppError(blockedStatuses[status], 400);
    }

    await apply_club_repositories(clubId, userID);
};
const approve_join_club_service = async (skaterId ,ClubId) => {
    const status = await isApplyRepository(skaterId);
    console.log(status, "status");
    const errorMap = {
        join: "Already joined",
        leave: "Apply first",
    };

    if (!status) {
        throw new AppError("Application not found");
    }

    if (errorMap[status]) {
        throw new AppError(errorMap[status]);
    }

    return await approve_join_club_repositories(skaterId ,ClubId);
};
export const reject_join_club_service = async (skaterId, clubId) => {
    const status = await isApplyRepository(skaterId);
    if (!status) {
        throw new AppError("Application not found", 404);
    }

    return await reject_join_club_repositories(skaterId, clubId);
};
const apply_leave_service = async (userId) => {
    const status = await isApplyRepository(userId);

    if (!status) {
        throw new AppError("Application not found");
    }

    const errorMap = {
        apply: "First join the club, then apply for leave",
        "apply-leave": "Leave request already submitted",
        leave: "Already left the club",
    };

    if (errorMap[status]) {
        throw new AppError(errorMap[status]);
    }

    // ✅ only "join" reaches here
    return await apply_leave_repository(userId);
};

const approve_leave_club_service = async (skaterId) => {
    if (!skaterId) {
        throw new AppError("Skater id is required", 400);
    }

    const status = await isApplyRepository(skaterId);
    if (!status) {
        throw new AppError("Application not found", 404);
    }
    if (status !== "apply-leave") {
        throw new AppError("Skater has not requested leave", 400);
    }

    return await approve_leave_club_repositories(skaterId);
}

const display_existing_club_service = async (id) => {
    return await display_existing_club_repositories(id);
}

const display_all_apply_skater_service = async (clubId, { page, limit } = {}) => {
    return await display_all_apply_skater_repositories(clubId, { page, limit });
};

export const display_all_club_skater_service = async (clubMemberId, query = {}) => {
    return await display_all_club_skater_repositories(clubMemberId, query);
};

export const display_club_skater_details_service = async (
    clubMemberId,
    skaterId
) => {
    return await display_club_skater_details_repositories(clubMemberId, skaterId);
};

export const remove_skater_from_club_service = async (clubMemberId, skaterId) => {
    return await remove_skater_from_club_repositories(clubMemberId, skaterId);
};

export const addSkaterByClubService = async (clubMemberId, skaterData) => {
    try {
        return await addSkaterByClubRepository(clubMemberId, skaterData);
    } catch (error) {
        throw mapCreateClubError(error);
    }
};

export {
    allClubService,
    allClubsInDbService,
    createClubService,
    displaySingleClubService,
    updateClubDetailsService,
    deleteClubSchema,
    clubsByUserDistrictService,
    apply_club_service,
    approve_join_club_service,
    apply_leave_service,
    approve_leave_club_service,
    display_existing_club_service,
    display_all_apply_skater_service,
}