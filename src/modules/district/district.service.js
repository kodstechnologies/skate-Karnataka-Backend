import { AppError } from "../../util/common/AppError.js";
import { acceptClubJoinRepository, acceptClubLeaveRepository, createDistrict, displayAllApplyRepository, displayDashboardDataRepository, displayDistrictProfileRepository, displaySkaterDetailsRepository, districtClubDetailsRepository, districtDeletedRepository, districtTotalClubsRepository, districtTotalSkatersRepository, districtUnLinkClubRepository, districtUpdateRepository, getAllDistrict, isDistrictAvailable, isDistrictExist, rejectClubJoinRepository, singleDistrictRepository, singleDistrictSkatersRepository } from "./district.repositories.js";

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

const displayAllApplyService = async (districtMemberId, { page, limit }) => {
    if (!districtMemberId) {
        throw new AppError("district member id is required", 400);
    }

    return await displayAllApplyRepository(districtMemberId, { page, limit });
};

const districtUnLinkClubService = async ({ districtMemberId, clubId }) => {
    if (!districtMemberId || !clubId) {
        throw new AppError("district member id and club id are required", 400);
    }

    return await districtUnLinkClubRepository({ districtMemberId, clubId });
};

const districtClubDetailsService = async ({ clubId }) => {
    if (!clubId) {
        throw new AppError("district member id and club id are required", 400);
    }

    return await districtClubDetailsRepository({ clubId });
};

const displaySkaterDetailsService = async (skaterId) => {
    if (!skaterId) {
        throw new AppError("skater id is required", 400);
    }
    console.log(skaterId, "skaterId====")
    return await displaySkaterDetailsRepository(skaterId);
};

export const displayDashboardData = async (districtId) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }

    return await displayDashboardDataRepository(districtId);
};

export const displayDistrictProfileServices = async (districtId) => {
    if (!districtId) {
        throw new AppError("districtId is required", 400);
    }
    return await displayDistrictProfileRepository(districtId);
}

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
    displayTotalSkatersService,
    displayAllApplyService,
    districtUnLinkClubService,
    districtClubDetailsService,
    displaySkaterDetailsService
}