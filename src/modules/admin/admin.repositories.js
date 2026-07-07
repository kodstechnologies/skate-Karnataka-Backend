import mongoose from "mongoose";
import { Admin } from "./admin.model.js";
import { AdminPasswordReset } from "./admin.passwordReset.model.js";
import { District } from "../district/district.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DistrictMember } from "../district/districtMember.model.js";
import { Club } from "../club/club.model.js";
import { ClubMember } from "../club/clubMember.model.js";
import { Skater } from "../skater/skater.model.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { Event } from "../event/event.model.js";
import { Gallery } from "../gallery/gallery.model.js";
import { EVENT_ADMIN_APPROVAL, EVENT_DELETE_APPROVAL } from "../event/eventApprovalPolicy.js";
import {
  MEDIA_ADMIN_APPROVAL,
  MEDIA_DELETE_APPROVAL,
} from "../gallery/galleryApprovalPolicy.js";
import { AppError } from "../../util/common/AppError.js";
import { calcTotalPages } from "../../util/common/paginate.js";

const countPendingEventApprovalsByOwner = async (eventType, ownerIds) => {
  const map = new Map();
  if (!ownerIds.length) return map;

  const oids = ownerIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await Event.aggregate([
    {
      $match: {
        eventType,
        eventFor: { $in: oids },
        $or: [
          { adminApprovalStatus: EVENT_ADMIN_APPROVAL.PENDING },
          { deleteApprovalStatus: EVENT_DELETE_APPROVAL.PENDING },
        ],
      },
    },
    {
      $group: {
        _id: "$eventFor",
        pendingEventApprovals: {
          $sum: {
            $cond: [{ $eq: ["$adminApprovalStatus", EVENT_ADMIN_APPROVAL.PENDING] }, 1, 0],
          },
        },
        pendingEventDeleteApprovals: {
          $sum: {
            $cond: [{ $eq: ["$deleteApprovalStatus", EVENT_DELETE_APPROVAL.PENDING] }, 1, 0],
          },
        },
      },
    },
  ]);

  rows.forEach((row) => {
    map.set(String(row._id), {
      pendingEventApprovals: row.pendingEventApprovals || 0,
      pendingEventDeleteApprovals: row.pendingEventDeleteApprovals || 0,
    });
  });

  return map;
};

const countPendingMediaApprovalsByOwner = async (ownerType, ownerIds) => {
  const map = new Map();
  if (!ownerIds.length) return map;

  const oids = ownerIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await Gallery.aggregate([
    {
      $match: {
        ownerType,
        ownerId: { $in: oids },
        $or: [
          { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.PENDING },
          { deleteApprovalStatus: MEDIA_DELETE_APPROVAL.PENDING },
        ],
      },
    },
    {
      $group: {
        _id: "$ownerId",
        pendingMediaApprovals: {
          $sum: {
            $cond: [{ $eq: ["$adminApprovalStatus", MEDIA_ADMIN_APPROVAL.PENDING] }, 1, 0],
          },
        },
        pendingMediaDeleteApprovals: {
          $sum: {
            $cond: [{ $eq: ["$deleteApprovalStatus", MEDIA_DELETE_APPROVAL.PENDING] }, 1, 0],
          },
        },
      },
    },
  ]);

  rows.forEach((row) => {
    map.set(String(row._id), {
      pendingMediaApprovals: row.pendingMediaApprovals || 0,
      pendingMediaDeleteApprovals: row.pendingMediaDeleteApprovals || 0,
    });
  });

  return map;
};

const mergeApprovalCounts = (eventMap, mediaMap, ownerId) => {
  const key = String(ownerId);
  const events = eventMap.get(key) || {};
  const media = mediaMap.get(key) || {};

  const pendingEventApprovals = events.pendingEventApprovals || 0;
  const pendingEventDeleteApprovals = events.pendingEventDeleteApprovals || 0;
  const pendingMediaApprovals = media.pendingMediaApprovals || 0;
  const pendingMediaDeleteApprovals = media.pendingMediaDeleteApprovals || 0;

  const eventApprovalPending =
    pendingEventApprovals > 0 || pendingEventDeleteApprovals > 0;
  const mediaApprovalPending =
    pendingMediaApprovals > 0 || pendingMediaDeleteApprovals > 0;

  return {
    pendingEventApprovals,
    pendingEventDeleteApprovals,
    pendingMediaApprovals,
    pendingMediaDeleteApprovals,
    /** true = show dot on events icon (upload or delete needs approve/reject). */
    event: eventApprovalPending,
    /** true = show dot on media icon (upload or delete needs approve/reject). */
    media: mediaApprovalPending,
    hasPendingEventApproval: eventApprovalPending,
    hasPendingMediaApproval: mediaApprovalPending,
  };
};

export const findAdminByEmail = async (email) => {
  return Admin.findOne({ email: email.toLowerCase().trim(), role: "admin" });
};

export const addRefreshTokenToAdmin = async (adminId, refreshToken) => {
  return Admin.findByIdAndUpdate(
    adminId,
    { $addToSet: { refreshTokens: refreshToken } },
    { new: true }
  );
};

export const removeRefreshTokenFromAdmin = async (adminId, refreshToken) => {
  if (!refreshToken) {
    return Admin.findByIdAndUpdate(
      adminId,
      { $set: { refreshTokens: [] } },
      { new: true }
    );
  }

  return Admin.findByIdAndUpdate(
    adminId,
    { $pull: { refreshTokens: refreshToken } },
    { new: true }
  );
};

export const upsertAdminPasswordResetOtp = async (email, otp) => {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  return AdminPasswordReset.findOneAndUpdate(
    { email: normalizedEmail },
    { email: normalizedEmail, otp, expiresAt, verified: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const getAdminPasswordResetOtp = async (email) => {
  return AdminPasswordReset.findOne({ email: email.toLowerCase().trim() });
};

export const markAdminPasswordOtpVerified = async (email) => {
  return AdminPasswordReset.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { verified: true },
    { new: true }
  );
};

export const deleteAdminPasswordResetOtp = async (email) => {
  return AdminPasswordReset.findOneAndDelete({ email: email.toLowerCase().trim() });
};

export const updateAdminPasswordByEmail = async (email, password) => {
  const admin = await Admin.findOne({
    email: email.toLowerCase().trim(),
    role: "admin",
  });

  if (!admin) {
    return null;
  }

  admin.password = password;
  await admin.save();
  return admin;
};

export const findAdminProfileById = async (adminId) => {
  return Admin.findOne({ _id: adminId, role: "admin" })
    .select("fullName phone email img gender address countryCode krsaId role")
    .lean();
};

export const updateAdminProfileById = async (adminId, payload) => {
  return Admin.findOneAndUpdate(
    { _id: adminId, role: "admin" },
    { $set: payload },
    { new: true, runValidators: true }
  )
    .select("fullName phone email img gender address countryCode krsaId role")
    .lean();
};

export const findDistrictNameById = async (districtId) => {
  if (!districtId) return "";
  const district = await District.findById(districtId).select("name").lean();
  return district?.name || "";
};

export const getAllDistrictsForAdmin = async ({ page = 1, limit = 10, name = "" }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);
  const skip = (currentPage - 1) * pageLimit;
  const trimmedName = String(name || "").trim();
  const query = trimmedName ? { name: { $regex: trimmedName, $options: "i" } } : {};

  const [total, districts] = await Promise.all([
    District.countDocuments(query),
    District.find(query)
      .select("_id name img about officeAddress presidentName members createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  const districtIds = districts.map((district) => district._id);
  const [eventApprovalMap, mediaApprovalMap] = await Promise.all([
    countPendingEventApprovalsByOwner("District", districtIds),
    countPendingMediaApprovalsByOwner("district", districtIds),
  ]);

  const data = districts.map((district) => ({
    ...district,
    memberCount: Array.isArray(district.members) ? district.members.length : 0,
    ...mergeApprovalCounts(eventApprovalMap, mediaApprovalMap, district._id),
  }));

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const findDistrictByName = async (name) => {
  return District.findOne({ name: name.trim() }).select("_id").lean();
};

export const createDistrictByAdmin = async (payload) => {
  return District.create(payload);
};

export const findDistrictById = async (districtId) => {
  return District.findById(districtId).select("_id name members club mainMember").lean();
};

export const updateDistrictByIdForAdmin = async (districtId, payload) => {
  return District.findByIdAndUpdate(
    districtId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .select("_id name img about officeAddress presidentName createdAt updatedAt")
    .lean();
};

export const deleteDistrictByIdForAdmin = async (districtId) => {
  return District.findByIdAndDelete(districtId).lean();
};

export const findDistrictMemberByPhoneOrEmail = async ({ phone, email, excludeId }) => {
  const orConditions = [];
  if (phone) {
    orConditions.push({ phone });
  }
  if (email) {
    orConditions.push({ email: email.toLowerCase().trim() });
  }
  if (!orConditions.length) return null;

  const query = { $or: orConditions };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return BaseAuth.findOne(query)
    .select("_id")
    .lean();
};

export const getAllDistrictMembers = async () => {
  return BaseAuth.find({ role: "District" })
    .select("_id fullName profile phone countryCode email gender address district role isActive")
    .populate("district", "_id name")
    .sort({ createdAt: -1 })
    .lean();
};

export const getDistrictMembersByDistrictId = async (
  districtId,
  { page = 1, limit = 10, search = "" } = {}
) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);
  const skip = (currentPage - 1) * pageLimit;
  const trimmedSearch = String(search || "").trim();

  const district = await District.findById(districtId).select("members mainMember").lean();
  const mainMemberId = district?.mainMember ? String(district.mainMember) : null;

  const query = {
    role: "District",
    district: districtId,
  };

  if (trimmedSearch) {
    query.$or = [
      { fullName: { $regex: trimmedSearch, $options: "i" } },
      { address: { $regex: trimmedSearch, $options: "i" } },
      { gender: { $regex: trimmedSearch, $options: "i" } },
      { email: { $regex: trimmedSearch, $options: "i" } },
      { phone: { $regex: trimmedSearch, $options: "i" } },
    ];
  }

  const [total, data] = await Promise.all([
    BaseAuth.countDocuments(query),
    BaseAuth.find(query)
      .select("_id fullName profile phone countryCode email gender address district role isActive isBlocked verify")
      .populate("district", "_id name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  const formattedData = data.map((member) => ({
    ...member,
    isMain: mainMemberId ? String(member._id) === mainMemberId : false,
    isBlocked: Boolean(member.isBlocked),
    verify: member.verify === true,
  }));

  return {
    data: formattedData,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const createDistrictMember = async (payload) => {
  const normalizedPayload = {
    ...payload,
    role: "District",
    verify: payload.verify === true,
  };

  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  return DistrictMember.create(normalizedPayload);
};

export const findDistrictMemberById = async (districtMemberId) => {
  return BaseAuth.findOne({ _id: districtMemberId, role: "District" })
    .select("_id fullName district")
    .lean();
};

export const updateDistrictMemberById = async (districtMemberId, payload) => {
  const normalizedPayload = { ...payload };
  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  return BaseAuth.findOneAndUpdate(
    { _id: districtMemberId, role: "District" },
    { $set: normalizedPayload },
    { new: true, runValidators: true }
  )
    .select("_id fullName profile phone countryCode email gender address district role isActive verify")
    .populate("district", "_id name")
    .lean();
};

export const deleteDistrictMemberById = async (districtMemberId) => {
  return BaseAuth.findOneAndDelete({ _id: districtMemberId, role: "District" }).lean();
};

export const addMemberToDistrict = async ({ districtId, memberId }) => {
  if (!districtId) return null;

  const district = await District.findById(districtId).select("mainMember").lean();
  const update = {
    $addToSet: { members: memberId },
    $set: { verify: true },
  };

  if (!district?.mainMember) {
    update.$set.mainMember = memberId;
  }

  return District.findByIdAndUpdate(districtId, update, { new: false }).lean();
};

export const setDistrictMainMember = async ({ districtId, memberId }) => {
  const district = await District.findById(districtId).select("members").lean();
  if (!district) {
    return null;
  }

  const memberIds = (district.members || []).map((id) => String(id));
  if (!memberIds.includes(String(memberId))) {
    return null;
  }

  return District.findByIdAndUpdate(
    districtId,
    { $set: { mainMember: memberId } },
    { new: true }
  )
    .select("_id name mainMember members")
    .lean();
};

export const clearDistrictMainMember = async (districtMemberId) => {
  return District.updateMany(
    { mainMember: districtMemberId },
    { $unset: { mainMember: "" } }
  );
};

export const findDistrictByMainMemberId = async (memberId) => {
  return District.findOne({ mainMember: memberId }).select("_id name").lean();
};

export const removeMemberFromDistrict = async ({ districtId, memberId }) => {
  if (!districtId) return null;

  await clearDistrictMainMember(memberId);

  return District.findByIdAndUpdate(
    districtId,
    { $pull: { members: memberId } },
    { new: false }
  ).lean();
};

export const getAllClubsForAdmin = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);
  const skip = (currentPage - 1) * pageLimit;
  const trimmedSearch = String(search || "").trim();
  const query = trimmedSearch
    ? {
      $or: [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { districtName: { $regex: trimmedSearch, $options: "i" } },
        { clubId: { $regex: trimmedSearch, $options: "i" } },
      ],
    }
    : {};

  const [total, clubs] = await Promise.all([
    Club.countDocuments(query),
    Club.find(query)
      .select("_id clubId name img officeAddress about district districtName districtStatus members")
      .populate("district", "_id name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  const clubIds = clubs.map((club) => club._id);
  const [eventApprovalMap, mediaApprovalMap] = await Promise.all([
    countPendingEventApprovalsByOwner("Club", clubIds),
    countPendingMediaApprovalsByOwner("club", clubIds),
  ]);

  const data = clubs.map((club) => ({
    ...club,
    memberCount: Array.isArray(club.members) ? club.members.length : 0,
    ...mergeApprovalCounts(eventApprovalMap, mediaApprovalMap, club._id),
  }));

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const findClubByIdForAdmin = async (clubId) => {
  return Club.findById(clubId).select("_id name district members mainMember").lean();
};

export const countSkatersByClubIdForAdmin = async (clubId) => {
  return BaseAuth.countDocuments({ role: "Skater", club: clubId });
};

export const findClubByNameAndDistrict = async ({ name, district }) => {
  return Club.findOne({ name: name.trim(), district }).select("_id").lean();
};

export const createClubByAdmin = async (payload) => {
  return Club.create(payload);
};

export const updateClubByIdForAdmin = async (clubId, payload) => {
  return Club.findByIdAndUpdate(clubId, { $set: payload }, { new: true, runValidators: true })
    .select("_id clubId name img officeAddress about district districtName districtStatus members")
    .populate("district", "_id name")
    .lean();
};

export const deleteClubByIdForAdmin = async (clubId) => {
  return Club.findByIdAndDelete(clubId).lean();
};

export const addClubToDistrict = async ({ districtId, clubId }) => {
  if (!districtId) return null;
  return District.findByIdAndUpdate(
    districtId,
    { $addToSet: { club: clubId } },
    { new: false }
  ).lean();
};

export const removeClubFromDistrict = async ({ districtId, clubId }) => {
  if (!districtId) return null;
  return District.findByIdAndUpdate(
    districtId,
    { $pull: { club: clubId } },
    { new: false }
  ).lean();
};

export const getClubMembersByClubId = async (
  clubId,
  { page = 1, limit = 10, search = "" } = {}
) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);
  const skip = (currentPage - 1) * pageLimit;
  const trimmedSearch = String(search || "").trim().toLowerCase();

  const club = await Club.findById(clubId)
    .select("_id name members mainMember")
    .populate(
      "members",
      "_id fullName profile phone countryCode email gender address district role isActive isBlocked verify"
    )
    .lean();

  const mainMemberId = club?.mainMember ? String(club.mainMember) : null;

  const allMembers = (Array.isArray(club?.members) ? club.members : []).map((member) => ({
    ...member,
    isMain: mainMemberId ? String(member._id) === mainMemberId : false,
    isBlocked: Boolean(member.isBlocked),
    verify: member.verify === true,
  }));

  const filteredMembers = trimmedSearch
    ? allMembers.filter((member) => {
      const fullName = String(member?.fullName || "").toLowerCase();
      const phone = String(member?.phone || "").toLowerCase();
      const email = String(member?.email || "").toLowerCase();
      const address = String(member?.address || "").toLowerCase();
      const gender = String(member?.gender || "").toLowerCase();

      return (
        fullName.includes(trimmedSearch) ||
        phone.includes(trimmedSearch) ||
        email.includes(trimmedSearch) ||
        address.includes(trimmedSearch) ||
        gender.includes(trimmedSearch)
      );
    })
    : allMembers;

  const paginatedMembers = filteredMembers.slice(skip, skip + pageLimit);

  return {
    clubId: club?._id || clubId,
    clubName: club?.name || "",
    mainMemberId,
    data: paginatedMembers,
    pagination: {
      total: filteredMembers.length,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(filteredMembers.length / pageLimit),
    },
  };
};

export const findClubMemberByPhoneOrEmail = async ({ phone, email, excludeId }) => {
  const orConditions = [];
  if (phone) {
    orConditions.push({ phone });
  }
  if (email) {
    orConditions.push({ email: email.toLowerCase().trim() });
  }
  if (!orConditions.length) return null;

  const query = { $or: orConditions };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return BaseAuth.findOne(query).select("_id").lean();
};

export const createClubMember = async (payload) => {
  const normalizedPayload = {
    ...payload,
    role: "Club",
    verify: payload.verify === true,
  };

  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  return ClubMember.create(normalizedPayload);
};

export const addMemberToClub = async ({ clubId, memberId }) => {
  const club = await Club.findById(clubId).select("mainMember members").lean();
  const update = { $addToSet: { members: memberId } };

  if (!club?.mainMember) {
    update.$set = { mainMember: memberId };
  }

  return Club.findByIdAndUpdate(clubId, update, { new: false }).lean();
};

export const setClubMainMember = async ({ clubId, memberId }) => {
  const club = await Club.findById(clubId).select("members").lean();
  if (!club) {
    return null;
  }

  const memberIds = (club.members || []).map((id) => String(id));
  if (!memberIds.includes(String(memberId))) {
    return null;
  }

  return Club.findByIdAndUpdate(
    clubId,
    { $set: { mainMember: memberId } },
    { new: true }
  )
    .select("_id name mainMember members")
    .lean();
};

export const clearClubMainMember = async (clubMemberId) => {
  return Club.updateMany(
    { mainMember: clubMemberId },
    { $unset: { mainMember: "" } }
  );
};

export const findClubByMainMemberId = async (memberId) => {
  return Club.findOne({ mainMember: memberId }).select("_id name").lean();
};

export const findClubMemberById = async (clubMemberId) => {
  return BaseAuth.findOne({ _id: clubMemberId, role: "Club" })
    .select("_id fullName")
    .lean();
};

export const updateClubMemberById = async (clubMemberId, payload) => {
  const normalizedPayload = { ...payload };
  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  return BaseAuth.findOneAndUpdate(
    { _id: clubMemberId, role: "Club" },
    { $set: normalizedPayload },
    { new: true, runValidators: true }
  )
    .select("_id fullName profile phone countryCode email gender address district role isActive verify")
    .lean();
};

export const deleteClubMemberById = async (clubMemberId) => {
  return BaseAuth.findOneAndDelete({ _id: clubMemberId, role: "Club" }).lean();
};

export const removeClubMemberFromAllClubs = async (clubMemberId) => {
  await clearClubMainMember(clubMemberId);

  return Club.updateMany(
    { members: clubMemberId },
    { $pull: { members: clubMemberId } }
  );
};

const collectDistrictIds = (skaters = []) => {
  const ids = new Set();

  for (const skater of skaters) {
    const districtRef = skater?.district;
    if (districtRef) {
      const districtId = districtRef._id || districtRef;
      if (districtId) ids.add(String(districtId));
    }

    const clubDistrictRef = skater?.club?.district;
    if (clubDistrictRef) {
      const clubDistrictId = clubDistrictRef._id || clubDistrictRef;
      if (clubDistrictId) ids.add(String(clubDistrictId));
    }
  }

  return [...ids];
};

const buildDistrictNameMap = async (skaters = []) => {
  const districtIds = collectDistrictIds(skaters);
  if (!districtIds.length) {
    return {};
  }

  const districts = await District.find({ _id: { $in: districtIds } })
    .select("_id name")
    .lean();

  return Object.fromEntries(
    districts.map((district) => [String(district._id), district.name || ""])
  );
};

const resolveSkaterDistrict = (skater, districtNameMap = {}) => {
  const populatedDistrict = skater?.district;
  if (populatedDistrict && typeof populatedDistrict === "object" && populatedDistrict.name) {
    return {
      _id: populatedDistrict._id,
      name: populatedDistrict.name,
    };
  }

  const districtId = populatedDistrict?._id || populatedDistrict;
  if (districtId && districtNameMap[String(districtId)]) {
    return {
      _id: districtId,
      name: districtNameMap[String(districtId)],
    };
  }

  const club = skater?.club;
  if (club?.district && typeof club.district === "object" && club.district.name) {
    return {
      _id: club.district._id,
      name: club.district.name,
    };
  }

  const clubDistrictId = club?.district?._id || club?.district;
  if (clubDistrictId && districtNameMap[String(clubDistrictId)]) {
    return {
      _id: clubDistrictId,
      name: districtNameMap[String(clubDistrictId)],
    };
  }

  if (club?.districtName) {
    return {
      _id: club.district || null,
      name: club.districtName,
    };
  }

  if (typeof populatedDistrict === "string" && populatedDistrict.trim()) {
    return { _id: null, name: populatedDistrict.trim() };
  }

  return null;
};

export const getAllSkatersForAdmin = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 10, 1);
  const skip = (currentPage - 1) * pageLimit;
  const trimmedSearch = String(search || "").trim();

  const query = { role: "Skater" };
  if (trimmedSearch) {
    const matchingDistricts = await District.find({
      name: { $regex: trimmedSearch, $options: "i" },
    })
      .select("_id")
      .lean();
    const districtIds = matchingDistricts.map((district) => district._id);

    const clubIdsFromDistrictName = districtIds.length
      ? await Club.find({ district: { $in: districtIds } })
          .select("_id")
          .lean()
      : [];
    const clubIds = clubIdsFromDistrictName.map((club) => club._id);

    query.$or = [
      { fullName: { $regex: trimmedSearch, $options: "i" } },
      { phone: { $regex: trimmedSearch, $options: "i" } },
      { address: { $regex: trimmedSearch, $options: "i" } },
      { gender: { $regex: trimmedSearch, $options: "i" } },
      { email: { $regex: trimmedSearch, $options: "i" } },
      { krsaId: { $regex: trimmedSearch, $options: "i" } },
      ...(districtIds.length ? [{ district: { $in: districtIds } }] : []),
      ...(clubIds.length ? [{ club: { $in: clubIds } }] : []),
    ];
  }

  const [total, skaters] = await Promise.all([
    BaseAuth.countDocuments(query),
    BaseAuth.find(query)
      .select("_id fullName profile phone address district gender email krsaId club isBlocked")
      .populate("district", "_id name")
      .populate({
        path: "club",
        select: "name district districtName",
        populate: { path: "district", select: "_id name" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  const districtNameMap = await buildDistrictNameMap(skaters);

  const formattedSkaters = skaters.map((skater) => {
    const district = resolveSkaterDistrict(skater, districtNameMap);
    return {
      _id: skater._id,
      fullName: skater.fullName || "",
      profile: skater.profile || "",
      phone: skater.phone || "",
      address: skater.address || "",
      district,
      districtName: district?.name || "",
      gender: skater.gender || "",
      email: skater.email || "",
      krsaId: skater.krsaId || "",
      isBlocked: Boolean(skater.isBlocked),
    };
  });

  return {
    data: formattedSkaters,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const createSkaterForAdmin = async (payload) => {
  const { fullName, phone, address, gender, email, district } = payload;

  const [existingPhone, existingEmail] = await Promise.all([
    BaseAuth.findOne({ phone }).select("_id").lean(),
    BaseAuth.findOne({ email: email.toLowerCase() }).select("_id").lean(),
  ]);

  if (existingPhone) {
    throw new AppError("This phone number is already registered", 409);
  }
  if (existingEmail) {
    throw new AppError("This email is already in use", 409);
  }

  const skaterPayload = {
    fullName: fullName.trim(),
    phone: phone.trim(),
    address: address.trim(),
    gender: gender.toLowerCase(),
    email: email.toLowerCase().trim(),
    role: "Skater",
    verify: false,
  };

  if (district) {
    skaterPayload.district = district;
  }

  const skater = await new Skater(skaterPayload).save();

  const districtDoc = district
    ? await District.findById(district).select("_id name").lean()
    : null;

  return {
    _id: skater._id,
    krsaId: skater.krsaId || "",
    fullName: skater.fullName || "",
    phone: skater.phone || "",
    email: skater.email || "",
    address: skater.address || "",
    gender: skater.gender || "",
    district: districtDoc
      ? { _id: districtDoc._id, name: districtDoc.name }
      : null,
    districtName: districtDoc?.name || "",
    isBlocked: Boolean(skater.isBlocked),
  };
};

export const getSkaterFullDetailsByIdForAdmin = async (skaterId) => {
  const skater = await Skater.findOne({ _id: skaterId, role: "Skater" })
    .select("-refreshTokens -isNotificationsEnabled -isActive -firebaseTokens")
    .populate("district", "_id name")
    .populate("club", "_id name clubId district districtName")
    .populate("category", "_id typeName")
    .lean();

  if (!skater) {
    return null;
  }

  const districtNameMap = await buildDistrictNameMap([skater]);
  const district = resolveSkaterDistrict(skater, districtNameMap);

  return {
    ...skater,
    district,
    districtName: district?.name || "",
    districtDetails: district,
  };
};

const castOptionalObjectId = (value) => {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    return undefined;
  }
  return new mongoose.Types.ObjectId(raw);
};

export const updateSkaterByIdForAdmin = async (skaterId, payload) => {
  const normalizedPayload = { ...payload };
  const removeDocumentUrls = normalizedPayload.removeDocumentUrls;
  const newDocuments = normalizedPayload.documents;

  delete normalizedPayload.removeDocumentUrls;
  delete normalizedPayload.documents;
  delete normalizedPayload.img;
  delete normalizedPayload.imgKey;
  delete normalizedPayload.photoKey;

  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  if (normalizedPayload.dob === "" || normalizedPayload.dob == null) {
    delete normalizedPayload.dob;
  } else if (normalizedPayload.dob) {
    normalizedPayload.dob = new Date(normalizedPayload.dob);
  }

  if (normalizedPayload.bloodGroup) {
    normalizedPayload.bloodGroup = String(normalizedPayload.bloodGroup).trim().toUpperCase();
  }

  if (normalizedPayload.aadharNumber === "") {
    normalizedPayload.aadharNumber = undefined;
  }

  for (const field of ["district", "club", "category"]) {
    if (!(field in normalizedPayload)) continue;

    const casted = castOptionalObjectId(normalizedPayload[field]);
    if (casted === undefined) {
      throw new AppError(`Invalid ${field}`, 400);
    }
    if (casted === null) {
      normalizedPayload[field] = null;
    } else {
      normalizedPayload[field] = casted;
    }
  }

  if (normalizedPayload.district) {
    const district = await District.findById(normalizedPayload.district).select("_id").lean();
    if (!district) {
      throw new AppError("District not found", 404);
    }
  }

  if (normalizedPayload.club) {
    const club = await Club.findById(normalizedPayload.club).select("_id district").lean();
    if (!club) {
      throw new AppError("Club not found", 404);
    }
    normalizedPayload.clubStatus = "join";
    if (!normalizedPayload.district && club.district) {
      normalizedPayload.district = club.district;
    }
  } else if (normalizedPayload.club === null) {
    normalizedPayload.clubStatus = "apply";
  }

  if (normalizedPayload.category) {
    const category = await SkatingEventCategory.findById(normalizedPayload.category)
      .select("_id")
      .lean();
    if (!category) {
      throw new AppError("Category not found", 404);
    }
  }

  const updateOperation = { $set: normalizedPayload };

  if (Array.isArray(newDocuments) && newDocuments.length > 0) {
    updateOperation.$push = {
      documents: { $each: newDocuments },
    };
  }

  const updated = await Skater.findOneAndUpdate(
    { _id: skaterId, role: "Skater" },
    updateOperation,
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return null;
  }

  const urlsToRemove = Array.isArray(removeDocumentUrls)
    ? removeDocumentUrls.filter(Boolean)
    : [];

  if (urlsToRemove.length) {
    await Skater.findOneAndUpdate(
      { _id: skaterId, role: "Skater" },
      { $pull: { documents: { url: { $in: urlsToRemove } } } }
    );
  }

  return getSkaterFullDetailsByIdForAdmin(skaterId);
};
