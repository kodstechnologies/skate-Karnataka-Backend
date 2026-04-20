import { AppError } from "../../util/common/AppError.js";
import { allClubsRepository, apply_club_repositories, apply_leave_repository, approve_join_club_repositories, clubIdStoreinDestrict, clubsByDistrictPaginatedRepository, createClubRepository, deleteClubDetails, display_existing_club_repositories, displayFullDetailsOfClub, isApplyRepository, isExistClub, isExistClubRepository, isThisClubExist, updateClubDetails } from "./club.repositories.js";

const allClubService = async (id ,page, limit) => {
    return await allClubsRepository(id ,page, limit);
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
        if (error?.code === 11000) {
            throw new AppError("Club name already exists in this district", 409);
        }
        throw error;
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
        if (error?.code === 11000) {
            throw new AppError("Club name already exists in this district", 409);
        }
        throw error;
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
const approve_join_club_service = async (userId) => {
    const status = await isApplyRepository(userId);
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

    return await approve_join_club_repositories(userId);
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

const display_existing_club_service = async (id) =>{
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