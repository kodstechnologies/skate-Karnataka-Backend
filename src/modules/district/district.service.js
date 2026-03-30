import { AppError } from "../../util/common/AppError.js";
import { createDistrict, districtDeletedRepository, districtUpdateRepository, getAllDistrict, isDistrictAvailable, isDistrictExist, singleDistrictRepository } from "./district.repositories.js";

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

export {
    getAllDistrictService,
    createNewDistrictService,
    singleDistrictAllClubNameService,
    updateDistrictService,
    districtDeletedService
}