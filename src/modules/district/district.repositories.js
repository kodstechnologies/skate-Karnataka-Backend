import { District } from "./district.model.js"
import { Club } from "../club/club.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { AppError } from "../../util/common/AppError.js";

const getAllDistrict = async () => {
    return await District.find().select("_id name").lean();
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
    const district = await District.findById(id)
      .select("_id name members")
      .populate("members", "_id fullName phone email role krsaId gender address")
      .lean();

    if (!district) return null;

    const clubs = await Club.find({ district: id }).select("_id name").lean();

    return {
      _id: district._id,
      name: district.name,
      totalUsers: (district.members || []).length,
      members: district.members || [],
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
  const district = await District.findById(id).select("members");

  if (!district) {
    throw new AppError("District not found", 404);
  }

  // 2️⃣ Prevent delete while district has members
  if ((district.members || []).length > 0) {
    throw new AppError("District has members, cannot delete", 400);
  }

  // 3️⃣ Update all related clubs
  await Club.updateMany(
    { district: id },
    {
      $unset: { district: "" },   // remove ObjectId reference
      $set: { districtName: "" }  // clear district name
    }
  );

  // 4️⃣ Delete district
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

const singleDistrictSkatersRepository = async (id) => {
  const district = await District.findById(id)
    .select("_id name members")
    .populate("members", "_id fullName phone email role krsaId")
    .lean();
  if (!district) {
    return null;
  }

  const skaters = await BaseAuth.find({
    district: id,
    role: "Skater",
  })
    .select("_id fullName phone email gender krsaId district role")
    .sort({ createdAt: -1 })
    .lean();

  return {
    district,
    districtMembers: district.members || [],
    totalMembers: skaters.length,
    skaters,
  };
};

const districtTotalClubsRepository = async (id) => {
  console.log(id, "///////////");

  const districtUser = await BaseAuth.findById(id).select("district");
  console.log(districtUser, "=++++++++++++");

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user", 404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id name club")
    .populate("club", "_id name address img")
    .lean();

  console.log(district, "===");

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const clubs = district.club || [];

  return {
    districtId: district._id,
    districtName: district.name,
    totalClubs: clubs.length,
    clubs,
  };
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
    rejectClubJoinRepository,
    singleDistrictSkatersRepository,
    districtTotalClubsRepository
}