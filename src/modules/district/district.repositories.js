import { District } from "./district.model.js"
import { Club } from "../club/club.model.js";
import { AppError } from "../../util/common/AppError.js";

const getAllDistrict = async () => {
    const districts = await District.find().select(
      "_id name -role"
    ).lean();

    return districts.map(({ role, ...rest }) => rest);
}
const isDistrictExist = async (name) => {
    return await District.findOne({ name });
}
const createDistrict = async (data) => {
    await District.create(data);
}

const isDistrictAvailable = async(id) =>{
    return await District.findById(id).select("name");
}

const singleDistrictRepository = async(id) =>{
    const district = await District.findById(id).select("_id name -role").lean();

    if (!district) return null;

    const clubs = await Club.find({ district: id }).select("_id name").lean();

    return {
      _id: district._id,
      name: district.name,
      totalClubs: clubs.length,
      clubs: clubs.map((club) => ({
        _id: club._id,
        name: club.name,
      })),
    };
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

const acceptClubJoinRepository = async ({ clubId, districtId }) => {
  const district = await District.findById(districtId).select("name").lean();
  if (!district) {
    throw new AppError("District not found", 404);
  }

  const clubBeforeUpdate = await Club.findById(clubId).select("applyDistrict").lean();
  if (!clubBeforeUpdate) {
    throw new AppError("Club not found", 404);
  }

  const requestedDistrict = (clubBeforeUpdate.applyDistrict || []).some(
    (id) => String(id) === String(districtId)
  );
  if (!requestedDistrict) {
    throw new AppError("Club did not apply for this district", 400);
  }

  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        district: districtId,
        districtName: district.name,
        districtStatus: "join",
      },
    },
    { new: true }
  );

  if (!updatedClub) {
    throw new AppError("Club not found", 404);
  }

  updatedClub.applyDistrict = [];
  await updatedClub.save();
  return updatedClub;
};

const acceptClubLeaveRepository = async ({ clubId }) => {
  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        districtStatus: "leave",
        districtName: "",
      },
      $unset: {
        district: "",
      },
    },
    { new: true }
  ).lean();

  if (!updatedClub) {
    throw new AppError("Club not found", 404);
  }

  return updatedClub;
};

const rejectClubJoinRepository = async ({ clubId, districtId }) => {
  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        districtStatus: "reject",
      },
      $pull: {
        applyDistrict: districtId,
      },
    },
    { new: true }
  ).lean();

  if (!updatedClub) {
    throw new AppError("Club not found", 404);
  }

  return updatedClub;
};
export {
    getAllDistrict,
    isDistrictExist,
    createDistrict,
    isDistrictAvailable,
    singleDistrictRepository,
    districtUpdateRepository,
    districtDeletedRepository,
    acceptClubJoinRepository,
    acceptClubLeaveRepository,
    rejectClubJoinRepository
}