import { AppError } from "../../util/common/AppError.js";
import { generateAccessToken, generateRefreshToken } from "../../util/token/token.js";
import {
  addRefreshTokenToAdmin,
  deleteAdminPasswordResetOtp,
  findAdminByEmail,
  getAdminPasswordResetOtp,
  markAdminPasswordOtpVerified,
  removeRefreshTokenFromAdmin,
  updateAdminPasswordByEmail,
  upsertAdminPasswordResetOtp,
} from "./admin.repositories.js";

export const adminLoginService = async ({ email, password }) => {
  const admin = await findAdminByEmail(email);

  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  if (!admin.password || admin.password !== password) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(admin);
  const refreshToken = generateRefreshToken(admin);

  await addRefreshTokenToAdmin(admin._id, refreshToken);

  return {
    admin: {
      _id: admin._id,
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
      phone: admin.phone,
    },
    accessToken,
    refreshToken,
  };
};

export const adminLogoutService = async ({ adminId, refreshToken }) => {
  if (!adminId) {
    throw new AppError("Admin not authenticated", 401);
  }

  await removeRefreshTokenFromAdmin(adminId, refreshToken);

  return { loggedOut: true };
};

export const adminForgotPasswordService = async ({ email }) => {
  const admin = await findAdminByEmail(email);

  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  return {
    email: admin.email,
    message: "Admin found. Please request OTP to reset password",
  };
};

export const adminSendOtpForPasswordService = async ({ email }) => {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  // As requested, OTP is fixed for now.
  const otp = "1234";
  await upsertAdminPasswordResetOtp(email, otp);

  return {
    email: admin.email,
    // otp,
    message: "OTP sent to email successfully",
  };
};

export const adminVerifyOtpForPasswordService = async ({
  email,
  otp,
}) => {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  const otpDoc = await getAdminPasswordResetOtp(email);
  if (!otpDoc) {
    throw new AppError("OTP not found. Please request a new OTP", 404);
  }

  if (otpDoc.expiresAt < new Date()) {
    throw new AppError("OTP expired. Please request a new OTP", 400);
  }

  if (otpDoc.otp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  await markAdminPasswordOtpVerified(email);

  return {
    email: admin.email,
    otpVerified: true,
    message: "OTP verified successfully. You can now reset password",
  };
};

export const adminResetPasswordService = async ({
  email,
  newPassword,
  confirmPassword,
}) => {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  const otpDoc = await getAdminPasswordResetOtp(email);
  if (!otpDoc || !otpDoc.verified) {
    throw new AppError("OTP is not verified. Please verify OTP first", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("New password and confirm password do not match", 400);
  }

  if (newPassword.length < 4) {
    throw new AppError("New password must be at least 4 characters", 400);
  }

  await updateAdminPasswordByEmail(email, newPassword);
  await deleteAdminPasswordResetOtp(email);

  return {
    email: admin.email,
    passwordReset: true,
  };
};
