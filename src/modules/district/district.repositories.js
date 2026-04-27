import { District } from "./district.model.js"
import { Club } from "../club/club.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { AppError } from "../../util/common/AppError.js";
import { Skater } from "../skater/skater.model.js";
import { Report } from "../report/report.model.js";
import { Event } from "../event/event.model.js";
import { paginate } from "../../util/common/paginate.js";

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

const districtTotalClubsRepository = async (id,{ page, limit }) => {

  const districtUser = await BaseAuth.findById(id).select("district");

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user",404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id name club")
    .lean();

  if (!district) {
    throw new AppError("District not found",404);
  }

  const clubIds = district.club || [];
  const totalClubs = clubIds.length;

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page,limit);

  const clubs = await Club.find({
      _id: { $in: clubIds }
    })
    .select("_id name address img skaters")
    .sort({ createdAt:-1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  return {
    data: clubs,

    pagination: {
      total: totalClubs,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(totalClubs / pageLimit)
    }
  };
};

const districtTotalSkatersRepository = async (id,{ page, limit }) => {

  const districtUser = await BaseAuth.findById(id)
    .select("district")
    .lean();

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user",404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id name club")
    .lean();

  if (!district) {
    throw new AppError("District not found",404);
  }

  const clubIds = district.club || [];

  const query = {
    club: { $in: clubIds }
  };

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page,limit);

  const skaters = await Skater.find(query)
    .select("_id krsaId fullName address photo club")
    .populate("club","_id name")
    .sort({ createdAt:-1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const totalSkaters = await Skater.countDocuments(query);

  return {
    data: skaters.map((skater)=>({
      skaterId: skater.krsaId || skater._id,
      img: skater.photo || "",
      name: skater.fullName || "",
      address: skater.address || "",
      clubName: skater.club?.name || ""
    })),

    pagination:{
      total: totalSkaters,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(totalSkaters / pageLimit)
    }
  };
};

export const displayDashboardDataRepository = async (id) => {

  const districtUser = await BaseAuth.findById(id).select("district");

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found",404);
  }

  const districtId = districtUser.district;

  const district = await District.findById(districtId)
    .select("name club")
    .lean();

  if (!district) {
    throw new AppError("District not found",404);
  }

  const clubIds = district.club || [];

  // Approved clubs
  const totalClubs = clubIds.length;

  // Skaters
  const totalSkaters = await Skater.countDocuments({
    club: { $in: clubIds }
  });

  // Pending club approvals (applied to this district)
  const pendingApprovals = await Club.countDocuments({
    applyDistrict: districtId,
    districtStatus: "apply"
  });

  // Reports status count
  const reportStats = await Report.aggregate([
    {
      $match: {
        ownClub: { $in: clubIds },
        status: {
          $in: ["pending","inprogress","notSolved"]
        }
      }
    },
    {
      $group:{
        _id:"$status",
        count:{ $sum:1 }
      }
    }
  ]);

  let pending=0;
  let inprogress=0;
  let notSolved=0;

  reportStats.forEach(item=>{
    if(item._id==="pending") pending=item.count;
    if(item._id==="inprogress") inprogress=item.count;
    if(item._id==="notSolved") notSolved=item.count;
  });

  // Latest event
  const latestEvent = await Event.findOne({
    eventType:"District",
    eventFor:districtId
  })
  .sort({createdAt:-1})
  .lean();

  return {
    districtId,
    districtName: district.name,

    dashboard:{
      totalClubs,
      totalSkaters,
      pendingApprovals, // 🔥 new count

      reports:{
        pending,
        inprogress,
        notSolved,
        totalReports:
          pending + inprogress + notSolved
      }
    },

    latestEvent : latestEvent || ""
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
    districtTotalClubsRepository,
    districtTotalSkatersRepository
}