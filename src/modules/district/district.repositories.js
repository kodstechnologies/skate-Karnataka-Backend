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

const isDistrictAvailable = async(id) =>{
    return await District.findById(id);
}

const singleDistrictRepository = async(id) =>{
    return await District.findById(id).populate("club")
}

const districtUpdateRepository = async (id, data) => {
  // 1️⃣ Update district
  const updatedDistrict = await District.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updatedDistrict) {
    throw new Error("District not found");
  }

  // 2️⃣ If name is updated → update all clubs
  if (data.name) {
    await Club.updateMany(
      { district: id },
      { $set: { districtName: data.name } }
    );
  }
};


const districtDeletedRepository = async (id) => {
  // 1️⃣ Check district exists
  const district = await District.findById(id);

  if (!district) {
    throw new Error("District not found");
  }

  // 2️⃣ Update all related clubs
  await Club.updateMany(
    { district: id },
    {
      $unset: { district: "" },   // remove ObjectId reference
      $set: { districtName: "" }  // clear district name
    }
  );

  // 3️⃣ Delete district
  await District.findByIdAndDelete(id);
};
export {
    getAllDistrict,
    isDistrictExist,
    createDistrict,
    isDistrictAvailable,
    singleDistrictRepository,
    districtUpdateRepository,
    districtDeletedRepository
}