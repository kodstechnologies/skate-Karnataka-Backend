import { AppError } from "../../util/common/AppError.js";
import { acceptClubJoinRepository, acceptClubLeaveRepository, createDistrict, displayDashboardDataRepository, districtDeletedRepository, districtTotalClubsRepository, districtTotalSkatersRepository, districtUpdateRepository, getAllDistrict, isDistrictAvailable, isDistrictExist, rejectClubJoinRepository, singleDistrictRepository, singleDistrictSkatersRepository } from "./district.repositories.js";

const getAllDistrictService = async () => {
    return await getAllDistrict();
};

const createNewDistrictService = async (data) => {
    const { name } = data;
    const isExist = await isDistrictExist(name);
    if (isExist) {
        throw new AppError("District already exist", 409)
    }
    await createDistrict(data);
}

const singleDistrictAllClubNameService = async (id) => {
    const isExist = await isDistrictAvailable(id);
    if (!isExist) {
        throw new AppError("District not available");
    }
    return await singleDistrictRepository(id);
}

const updateDistrictService = async (id, data) => {
    const isExist = await isDistrictAvailable(id);
    if (!isExist) {
        throw new AppError("District not available");
    }
    await districtUpdateRepository(id, data);
}

const districtDeletedService = async (id) => {
    const isExist = await isDistrictAvailable(id);
    if (!isExist) {
        throw new AppError("District not available");
    }
    await districtDeletedRepository(id);
}

const acceptClubService = async ({ clubId, districtId }) => {
    if (!clubId || !districtId) {
        throw new AppError("clubId and districtId are required", 400);
    }
    return await acceptClubJoinRepository({ clubId, districtId });
};

const leaveClubService = async ({ clubId }) => {
    if (!clubId) {
        throw new AppError("clubId is required", 400);
    }
    return await acceptClubLeaveRepository({ clubId });
};

const rejectClubService = async ({ clubId, districtId }) => {
    if (!clubId || !districtId) {
        throw new AppError("clubId and districtId are required", 400);
    }
    return await rejectClubJoinRepository({ clubId, districtId });
};

const singleDistrictSkatersService = async (id) => {
    const isExist = await isDistrictAvailable(id);
    if (!isExist) {
        throw new AppError("District not available", 404);
    }

    return await singleDistrictSkatersRepository(id);
};

const displayTotalClubsService = async (districtId, { page, limit }) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }

    return await districtTotalClubsRepository(districtId, { page, limit });
};

const displayTotalSkatersService = async (districtId, { page, limit }) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }

    return await districtTotalSkatersRepository(districtId, { page, limit });
};

export const displayDashboardData = async (districtId) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }

    return await displayDashboardDataRepository(districtId);
};


export {
    getAllDistrictService,
    createNewDistrictService,
    singleDistrictAllClubNameService,
    updateDistrictService,
    districtDeletedService,
    acceptClubService,
    leaveClubService,
    rejectClubService,
    singleDistrictSkatersService,
    displayTotalClubsService,
    displayTotalSkatersService
}