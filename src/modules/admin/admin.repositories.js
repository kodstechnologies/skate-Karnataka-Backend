import { Admin } from "./admin.model.js";
import { AdminPasswordReset } from "./admin.passwordReset.model.js";

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
  return Admin.findOneAndUpdate(
    { email: email.toLowerCase().trim(), role: "admin" },
    { $set: { password } },
    { new: true }
  );
};
