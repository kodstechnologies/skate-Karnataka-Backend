import { District } from "./district.model.js"
import { Club } from "../club/club.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { AppError } from "../../util/common/AppError.js";
import { Skater } from "../skater/skater.model.js";
import { Report } from "../report/report.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import mongoose from "mongoose";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";

const getAllDistrict = async () => {
  return await District.find().select("_id name").lean();
}
const isDistrictExist = async (name) => {
  return await District.findOne({ name });
}
const createDistrict = async (data) => {
  await District.create(data);
}

const isDistrictAvailable = async (id) => {
  return await District.findById(id).select("name");
}

const singleDistrictRepository = async (id) => {
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

  const district = await District.findOne({
    $or: [{ _id: districtId }, { members: districtId }],
  })
    .select("_id name")
    .lean();
  if (!district) {
    throw new AppError("District not found", 404);
  }

  const clubBeforeUpdate = await Club.findById(clubId).select("applyDistrict").lean();
  if (!clubBeforeUpdate) {
    throw new AppError("Club not found", 404);
  }

  const requestedDistrict = (clubBeforeUpdate.applyDistrict || []).some(
    (id) => String(id) === String(district._id)
  );
  if (!requestedDistrict) {
    throw new AppError("Club did not apply for this district", 400);
  }

  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        district: district._id,
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

const acceptClubLeaveRepository = async ({ clubId, districtMemberId }) => {
  const district = await resolveDistrictFromMember(districtMemberId);
  const clubOid = new mongoose.Types.ObjectId(clubId);

  const club = await Club.findById(clubOid)
    .select("_id clubId name district districtName districtStatus")
    .lean();

  if (!club) {
    throw new AppError("Club not found", 404);
  }

  if (String(club.district || "") !== String(district._id)) {
    throw new AppError("Club is not affiliated with this district", 400);
  }

  if (club.districtStatus !== "apply-leave") {
    throw new AppError("No pending district leave request", 400);
  }

  const [updatedClub] = await Promise.all([
    Club.findByIdAndUpdate(
      clubOid,
      {
        $set: {
          districtStatus: "leave",
          districtName: "",
        },
        $unset: {
          district: 1,
        },
        $pull: {
          applyDistrict: district._id,
        },
      },
      { new: true, runValidators: true }
    )
      .select("_id clubId name district districtName districtStatus")
      .lean(),
    District.findByIdAndUpdate(district._id, {
      $pull: { club: clubOid },
    }),
  ]);

  if (!updatedClub) {
    throw new AppError("Club not found", 404);
  }

  return {
    clubId: updatedClub._id,
    clubKrsaId: updatedClub.clubId || "",
    clubName: updatedClub.name || "",
    districtStatus: updatedClub.districtStatus,
    districtName: updatedClub.districtName || "",
    districtId: updatedClub.district ? String(updatedClub.district) : null,
  };
};

const rejectClubLeaveRepository = async ({ clubId, districtMemberId }) => {
  const district = await resolveDistrictFromMember(districtMemberId);

  const club = await Club.findById(clubId)
    .select("_id clubId name district districtName districtStatus")
    .lean();

  if (!club) {
    throw new AppError("Club not found", 404);
  }

  if (String(club.district || "") !== String(district._id)) {
    throw new AppError("Club is not affiliated with this district", 400);
  }

  if (club.districtStatus !== "apply-leave") {
    throw new AppError("No pending district leave request", 400);
  }

  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        districtStatus: "join",
        district: club.district,
        districtName: club.districtName || "",
      },
    },
    { new: true }
  )
    .select("_id clubId name district districtName districtStatus")
    .lean();

  return {
    clubId: updatedClub._id,
    clubKrsaId: updatedClub.clubId || "",
    clubName: updatedClub.name || "",
    districtId: String(updatedClub.district || club.district),
    districtName: updatedClub.districtName || club.districtName || "",
    districtStatus: updatedClub.districtStatus,
  };
};

const rejectClubJoinRepository = async ({ clubId, districtId }) => {
  const district = await District.findOne({
    $or: [{ _id: districtId }, { members: districtId }],
  })
    .select("_id")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    {
      $set: {
        districtStatus: "reject",
      },
      $pull: {
        applyDistrict: district._id,
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

const districtTotalClubsRepository = async (id, { page, limit }) => {

  const districtUser = await BaseAuth.findById(id).select("district");

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user", 404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id name club")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const clubIds = district.club || [];
  const totalClubs = clubIds.length;

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page, limit);

  const clubs = await Club.find({
    _id: { $in: clubIds }
  })
    .select("_id name address img")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const pageClubIds = clubs.map((club) => club._id);
  const skaterCounts = pageClubIds.length
    ? await Skater.aggregate([
        {
          $match: {
            club: { $in: pageClubIds },
            clubStatus: "join",
          },
        },
        {
          $group: {
            _id: "$club",
            count: { $sum: 1 },
          },
        },
      ])
    : [];

  const skaterCountByClub = new Map(
    skaterCounts.map((item) => [String(item._id), item.count])
  );

  const data = clubs.map((club) => ({
    _id: club._id,
    name: club.name,
    img: club.img,
    skaters: skaterCountByClub.get(String(club._id)) ?? 0,
  }));

  return {
    data,

    pagination: {
      total: totalClubs,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(totalClubs / pageLimit)
    }
  };
};

const districtTotalSkatersRepository = async (id, { page, limit }) => {

  const districtUser = await BaseAuth.findById(id)
    .select("district")
    .lean();

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user", 404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id name club")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const clubIds = district.club || [];

  const query = {
    club: { $in: clubIds }
  };

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page, limit);

  const skaters = await Skater.find(query)
    .select("_id krsaId fullName address photo club")
    .populate("club", "_id name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const totalSkaters = await Skater.countDocuments(query);

  return {
    data: skaters.map((skater) => ({

      skaterId: skater._id || "",
      krsaId: skater.krsaId || "",
      img: skater.photo || "",
      name: skater.fullName || "",
      address: skater.address || "",
      clubName: skater.club?.name || ""
    })),

    pagination: {
      total: totalSkaters,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(totalSkaters / pageLimit)
    }
  };
};

const displayAllApplyRepository = async (districtMemberId, { page, limit }) => {
  const district = await District.findOne({ members: districtMemberId })
    .select("_id name")
    .lean();

  if (!district) {
    throw new AppError("District not found for this member", 404);
  }

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const query = {
    applyDistrict: district._id,
    districtStatus: "apply",
  };

  const [total, data] = await Promise.all([
    Club.countDocuments(query),
    Club.find(query)
      .select("_id clubId name img address districtStatus applyDistrict createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  return {
    district: {
      id: district._id,
      name: district.name || "",
    },
    data,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

const resolveDistrictFromMember = async (districtMemberId) => {
  const districtUser = await BaseAuth.findById(districtMemberId)
    .select("district")
    .lean();

  const districtId = districtUser?.district || districtMemberId;

  const district = await District.findOne({
    $or: [{ _id: districtId }, { members: districtMemberId }],
  })
    .select("_id name")
    .lean();

  if (!district) {
    throw new AppError("District not found for this member", 404);
  }

  return district;
};

const formatDistrictPendingItem = (type, id, sortAt, fields = {}) => ({
  type,
  id: String(id),
  sortAt,
  ...fields,
});

export const displayApplyAllClubRepository = async (
  districtMemberId,
  { page = 1, limit = 10 } = {}
) => {
  const district = await resolveDistrictFromMember(districtMemberId);
  const districtOid = district._id;

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const data = [];

  const [joinClubs, leaveClubs, districtClubs] = await Promise.all([
    Club.find({
      districtStatus: "apply",
      applyDistrict: districtOid,
    })
      .select("_id clubId name createdAt")
      .sort({ createdAt: -1 })
      .lean(),

    Club.find({
      districtStatus: "apply-leave",
      district: districtOid,
    })
      .select("_id clubId name createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),

    Club.find({ district: districtOid })
      .select("_id clubId name")
      .lean(),
  ]);

  const clubById = new Map(
    districtClubs.map((club) => [String(club._id), club])
  );
  const districtClubIds = districtClubs.map((club) => club._id);

  for (const club of joinClubs) {
    data.push(
      formatDistrictPendingItem("joinDistrict", club._id, club.createdAt, {
        krsaId: club.clubId || "",
        clubName: club.name || "",
      })
    );
  }

  for (const club of leaveClubs) {
    data.push(
      formatDistrictPendingItem(
        "leaveDistrict",
        club._id,
        club.updatedAt || club.createdAt,
        {
          krsaId: club.clubId || "",
          clubName: club.name || "",
        }
      )
    );
  }

  if (districtClubIds.length > 0) {
    const skaters = await Skater.find({
      role: "Skater",
      club: { $in: districtClubIds },
    })
      .select("_id fullName krsaId club")
      .lean();

    const skaterProfileById = new Map(
      skaters.map((row) => [String(row._id), row])
    );
    const memberIdList = skaters.map((row) => row._id);

    if (memberIdList.length > 0) {
      const certificationApplications = await EventParticipant.find({
        userId: { $in: memberIdList },
        skaterApply: true,
        clubAllow: true,
        districtAllow: { $ne: true },
      })
        .select("userId ageGroup eventId updatedAt createdAt")
        .populate({ path: "eventId", select: "header" })
        .sort({ updatedAt: -1 })
        .lean();

      const seenCertApplications = new Set();

      for (const participant of certificationApplications) {
        const participantKey = String(participant._id);
        if (seenCertApplications.has(participantKey)) continue;
        seenCertApplications.add(participantKey);

        const skaterId = String(participant.userId || "");
        const skaterProfile = skaterProfileById.get(skaterId);
        if (!skaterProfile) continue;

        const clubDoc = clubById.get(String(skaterProfile.club || ""));

        data.push(
          formatDistrictPendingItem(
            "certificateRequest",
            participant._id,
            participant.updatedAt || participant.createdAt,
            {
              krsaId: skaterProfile.krsaId || "",
              fullName: skaterProfile.fullName || "",
              clubId: clubDoc?.clubId || "",
              clubName: clubDoc?.name || "",
              eventName: participant.eventId?.header || "",
              ageGroup: participant.ageGroup || "",
            }
          )
        );
      }
    }
  }

  data.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

  const total = data.length;
  const paged = data.slice(skip, skip + pageLimit).map(({ sortAt, ...row }) => row);

  const countByType = (type) => data.filter((row) => row.type === type).length;

  return {
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
    counts: {
      joinDistrict: countByType("joinDistrict"),
      leaveDistrict: countByType("leaveDistrict"),
      certificateRequest: countByType("certificateRequest"),
    },
    data: paged,
  };
};

const districtUnLinkClubRepository = async ({ districtMemberId, clubId }) => {
  const district = await District.findOne({
    $or: [{ _id: districtMemberId }, { members: districtMemberId }],
  })
    .select("_id name club")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const club = await Club.findById(clubId)
    .select("_id district")
    .lean();

  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const belongsToDistrict =
    String(club?.district || "") === String(district._id) ||
    (district.club || []).some((id) => String(id) === String(clubId));

  if (!belongsToDistrict) {
    throw new AppError("Club is not linked with this district", 400);
  }

  await Promise.all([
    District.findByIdAndUpdate(
      district._id,
      { $pull: { club: clubId } },
      { new: false }
    ),
    Club.findByIdAndUpdate(
      clubId,
      {
        $unset: { district: "" },
        $set: { districtName: "", districtStatus: "leave" },
      },
      { new: false }
    ),
  ]);

  return {
    districtId: district._id,
    clubId,
    unlinked: true,
  };
};

const districtClubSkatersRepository = async (districtMemberId, clubId, { page, limit }) => {
  const districtUser = await BaseAuth.findById(districtMemberId)
    .select("district")
    .lean();

  if (!districtUser?.district) {
    throw new AppError("District Id not found in user", 404);
  }

  const district = await District.findById(districtUser.district)
    .select("_id club")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  const club = await Club.findById(clubId).select("_id district").lean();

  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const belongsToDistrict =
    String(club.district || "") === String(district._id) ||
    (district.club || []).some((id) => String(id) === String(clubId));

  if (!belongsToDistrict) {
    throw new AppError("Club is not linked with this district", 403);
  }

  const {
    skip,
    limit: pageLimit,
    page: currentPage,
  } = paginate(page, limit);

  const filter = { club: club._id, role: "Skater" };

  const [total, skaters] = await Promise.all([
    Skater.countDocuments(filter),
    Skater.find(filter)
      .select("_id fullName photo krsaId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  return {
    data: skaters.map((skater) => ({
      id: skater._id,
      name: skater.fullName || "",
      photo: skater.photo || "",
      krsaId: skater.krsaId || "",
    })),
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

const districtClubDetailsRepository = async ({ clubId }) => {

  const club = await Club.findById(clubId)
    .select(
      "_id clubId name address about districtStatus"
    )
    .lean();

  if (!club) {
    throw new AppError(
      "Club not found",
      404
    );
  }

  const totalSkaters = await Skater.countDocuments({
    club: club._id,
    clubStatus: "join"
  });

  return {
    clubId: club.clubId || String(club._id),
    name: club.name || "",
    officeAddress: club.address || "",
    about: club.about || "",
    totalSkaters,
    districtStatus: club.districtStatus || ""
  };
};

const displaySkaterDetailsRepository = async (skaterId) => {

  const skater = await BaseAuth.findById(skaterId)
    .select(
      "_id fullName photo address krsaId"
    )
    .lean();

  if (!skater) {
    throw new AppError(
      "Skater not found",
      404
    );
  }

  return {
    name: skater.fullName || "",
    img: skater.photo || "",
    krsaId: skater.krsaId || "",

    address: skater.address || "Address not available",

    districtRank: 0,
    stateRank: 0,

    gold: 0,
    silver: 0,
    bronze: 0
  };
};

export const displayDashboardDataRepository = async (id) => {

  const districtUser = await BaseAuth.findById(id).select("district");

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found", 404);
  }

  const districtId = districtUser.district;

  const district = await District.findById(districtId)
    .select("name club")
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
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
          $in: ["pending", "inprogress", "notSolved"]
        }
      }
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  let pending = 0;
  let inprogress = 0;
  let notSolved = 0;

  reportStats.forEach(item => {
    if (item._id === "pending") pending = item.count;
    if (item._id === "inprogress") inprogress = item.count;
    if (item._id === "notSolved") notSolved = item.count;
  });

  // Latest event
  const latestEvent = await Event.findOne({
    eventType: "District",
    eventFor: districtId
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    districtId,
    districtName: district.name,

    dashboard: {
      totalClubs,
      totalSkaters,
      pendingApprovals, // 🔥 new count

      reports: {
        pending,
        inprogress,
        notSolved,
        totalReports:
          pending + inprogress + notSolved
      }
    },

    latestEvent: latestEvent ?? null,
  };
};


export const displayDistrictProfileRepository = async (id) => {

  const districtUser = await BaseAuth.findById(id)
    .select("district krsaId fullName phone email profile gender address role")
    .lean();

  if (!districtUser || !districtUser.district) {
    throw new AppError("District Id not found in user", 404);
  }

  let district = await District.findById(districtUser.district)
    .select(
      "_id districtKrsaId name img officeAddress about presidentName rank championships"
    )
    .lean();

  if (!district) {
    throw new AppError("District not found", 404);
  }

  if (!district.districtKrsaId) {
    const saved = await District.findById(district._id);
    if (saved && !saved.districtKrsaId) {
      await saved.save();
      district = saved.toObject();
    }
  }

  const districtKrsaId = district.districtKrsaId || "";

  return {
    districtId: district._id || "",
    districtKrsaId,
    districtName: district.name || "",
    img: district.img || "",
    officeAddress: district.officeAddress || "",
    about: district.about || "",
    presidentName: district.presidentName || "",
    currentMember: {
      userId: districtUser._id || "",
      fullName: districtUser.fullName || "",
      phone: districtUser.phone || "",
      email: districtUser.email || "",
      photo: districtUser.profile || "",
      gender: districtUser.gender || "",
      address: districtUser.address || "",
      role: districtUser.role || "District",
      krsaId: districtUser.krsaId || "",
    },
    // rank: district.rank || 0,
    // championships: district.championships || 0
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
  rejectClubLeaveRepository,
  rejectClubJoinRepository,
  singleDistrictSkatersRepository,
  districtTotalClubsRepository,
  districtTotalSkatersRepository,
  displayAllApplyRepository,
  districtUnLinkClubRepository,
  districtClubDetailsRepository,
  districtClubSkatersRepository,
  displaySkaterDetailsRepository
}