import { Admin } from "./admin.model.js";
import { AdminPasswordReset } from "./admin.passwordReset.model.js";
import { District } from "../district/district.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DistrictMember } from "../district/districtMember.model.js";

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

export const getAllDistrictsForAdmin = async () => {
  return District.find()
    .select("_id name img about officeAddress presidentName createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();
};

export const findDistrictByName = async (name) => {
  return District.findOne({ name: name.trim() }).select("_id").lean();
};

export const createDistrictByAdmin = async (payload) => {
  return District.create(payload);
};

export const findDistrictById = async (districtId) => {
  return District.findById(districtId).select("_id name members").lean();
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

export const findDistrictMemberByPhoneOrEmail = async ({ phone, email }) => {
  const orConditions = [];
  if (phone) {
    orConditions.push({ phone });
  }
  if (email) {
    orConditions.push({ email: email.toLowerCase().trim() });
  }
  if (!orConditions.length) return null;

  return BaseAuth.findOne({ $or: orConditions })
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

export const getDistrictMembersByDistrictId = async (districtId) => {
  return BaseAuth.find({ role: "District", district: districtId })
    .select("_id fullName profile phone countryCode email gender address district role isActive")
    .populate("district", "_id name")
    .sort({ createdAt: -1 })
    .lean();
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
    { $addToSet: { members: memberId } },
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
