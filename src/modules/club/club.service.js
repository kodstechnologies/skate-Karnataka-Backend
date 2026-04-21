import { AppError } from "../../util/common/AppError.js";
import { allClubsRepository, apply_club_repositories, apply_leave_repository, approve_join_club_repositories, clubIdStoreinDestrict, clubsByDistrictPaginatedRepository, createClubRepository, deleteClubDetails, display_existing_club_repositories, displayClubDashboardRepositories, displayFullDetailsOfClub, isApplyRepository, isExistClub, isExistClubRepository, isThisClubExist, pendingApprovalsRepositories, updateClubDetails } from "./club.repositories.js";


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

export const pendingApprovalsServices = async (clubId, { page, limit }) => {
    return await pendingApprovalsRepositories(clubId, { page, limit });
};
export const reportServices = async(clubId) =>{
return await reportRepositories({clubId})
}

const allClubService = async (id, page, limit) => {
    return await allClubsRepository(id, page, limit);
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
    if (!user?.district) {
        throw new AppError("User has no district assigned", 400);
    }
    return await clubsByDistrictPaginatedRepository(user.district, { page, limit });
};

const apply_club_service = async (clubId, userID) => {
    const clubExists = await isExistClubRepository(userID);

    if (clubExists) {
        throw new AppError("Already applied");
    }

    await apply_club_repositories(clubId, userID);
};
const approve_join_club_service = async (skaterId) => {
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

    return await approve_join_club_repositories(skaterId);
};
const apply_leave_service = async (userId) => {
    const status = await isApplyRepository(userId);

    if (!status) {
        throw new AppError("Application not found");
    }

    const errorMap = {
        apply: "First join the club, then apply for leave",
        leave: "Already left the club",
    };

    if (errorMap[status]) {
        throw new AppError(errorMap[status]);
    }

    // ✅ only "join" reaches here
    return await apply_leave_repository(userId);
};

const approve_leave_club_service = async () => {

}

const display_existing_club_service = async (id) => {
    return await display_existing_club_repositories(id);
}

export {
    allClubService,
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
}