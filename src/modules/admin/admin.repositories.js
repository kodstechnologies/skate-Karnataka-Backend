import { Admin } from "./admin.model.js";
import { AdminPasswordReset } from "./admin.passwordReset.model.js";
import { District } from "../district/district.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DistrictMember } from "../district/districtMember.model.js";
import { Club } from "../club/club.model.js";
import { ClubMember } from "../club/clubMember.model.js";
import { calcTotalPages } from "../../util/common/paginate.js";

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

  const data = districts.map((district) => ({
    ...district,
    memberCount: Array.isArray(district.members) ? district.members.length : 0,
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
  return District.findById(districtId).select("_id name members club").lean();
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
      .select("_id fullName profile phone countryCode email gender address district role isActive")
      .populate("district", "_id name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

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

export const createDistrictMember = async (payload) => {
  const normalizedPayload = {
    ...payload,
    role: "District",
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
    .select("_id fullName profile phone countryCode email gender address district role isActive")
    .populate("district", "_id name")
    .lean();
};

export const deleteDistrictMemberById = async (districtMemberId) => {
  return BaseAuth.findOneAndDelete({ _id: districtMemberId, role: "District" }).lean();
};

export const addMemberToDistrict = async ({ districtId, memberId }) => {
  if (!districtId) return null;
  return District.findByIdAndUpdate(
    districtId,
    {
      $addToSet: { members: memberId },
      $set: { verify: true },
    },
    { new: false }
  ).lean();
};

export const removeMemberFromDistrict = async ({ districtId, memberId }) => {
  if (!districtId) return null;
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

  const data = clubs.map((club) => ({
    ...club,
    memberCount: Array.isArray(club.members) ? club.members.length : 0,
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
  return Club.findById(clubId).select("_id name district members").lean();
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
    .select("_id name members")
    .populate(
      "members",
      "_id fullName profile phone countryCode email gender address district role isActive"
    )
    .lean();

  const allMembers = Array.isArray(club?.members) ? club.members : [];

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
    verify:true,

  };

  if (normalizedPayload.email) {
    normalizedPayload.email = normalizedPayload.email.toLowerCase().trim();
  }

  return ClubMember.create(normalizedPayload);
};

export const addMemberToClub = async ({ clubId, memberId }) => {
  return Club.findByIdAndUpdate(
    clubId,
    { $addToSet: { members: memberId } },
    { new: false }
  ).lean();
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
    .select("_id fullName profile phone countryCode email gender address district role isActive")
    .lean();
};

export const deleteClubMemberById = async (clubMemberId) => {
  return BaseAuth.findOneAndDelete({ _id: clubMemberId, role: "Club" }).lean();
};

export const removeClubMemberFromAllClubs = async (clubMemberId) => {
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
      .select("_id fullName profile phone address district gender email krsaId club")
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

export const getSkaterFullDetailsByIdForAdmin = async (skaterId) => {
  const skater = await BaseAuth.findOne({ _id: skaterId, role: "Skater" })
    .select("-refreshTokens -isNotificationsEnabled -isActive -firebaseTokens")
    .populate("district", "_id name")
    .populate("club", "_id name clubId district districtName")
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
