import { AppError } from "../../util/common/AppError.js";
import { createDistrict, getAllDistrict, isDistrictExist } from "./district.repositories.js";

const getAllDistrictService = async () => {
    return await getAllDistrict();
};

const createNewDistrictService = async (data) => {
    console.log(data,"data===")
    const {name} = data;
    const isExist = await isDistrictExist(name);
    console.log(isExist,"=====+++")
    if (isExist){
        throw new AppError("District already exist",409)
    }
        await createDistrict(data);
}

export {
    getAllDistrictService,
    createNewDistrictService
}