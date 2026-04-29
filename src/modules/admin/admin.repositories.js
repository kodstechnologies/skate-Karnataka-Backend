import { Admin } from "./admin.model.js";
import { AdminPasswordReset } from "./admin.passwordReset.model.js";
import { District } from "../district/district.model.js";

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
