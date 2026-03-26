import { District } from "./district.model.js"

const getAllDistrict = async () => {
    const Districts = await District.find().select("_id name");;
    return Districts;
}
const isDistrictExist = async (name) => {
    return await District.findOne({ name });
}
const createDistrict = async (name) => {
    await District.create(name);
}

export {
    getAllDistrict,
    isDistrictExist,
    createDistrict
}