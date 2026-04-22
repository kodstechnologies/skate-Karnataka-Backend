import { NODE_ENV } from "../../config/envConfig.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  adminForgotPasswordService,
  adminLoginService,
  adminLogoutService,
  adminResetPasswordService,
  adminSendOtpForPasswordService,
  editAdminProfileService,
  getAdminProfileService,
  adminVerifyOtpForPasswordService,
} from "./admin.service.js";

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: false, //NODE_ENV === "production"
  sameSite: "lax",
  maxAge,
});

export const adminLogin = asyncHandler(async (req, res) => {
  const result = await adminLoginService(req.body);

  res.cookie("access_token", result.accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie("refresh_token", result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        admin: result.admin,
      },
      "Admin logged in successfully"
    )
  );
});

export const adminLogout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  const result = await adminLogoutService({
    adminId: req.user?._id,
    refreshToken,
  });

  const clearOptions = {
    httpOnly: true,
    secure: false, //NODE_ENV === "production'
    sameSite: "lax", //none
    
  };

  res.clearCookie("access_token", clearOptions);
  res.clearCookie("refresh_token", clearOptions);

  return res.status(200).json(new ApiResponse(200, result, "Admin logged out successfully"));
});

export const adminForgotPassword = asyncHandler(async (req, res) => {
  const result = await adminForgotPasswordService(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Forgot password request accepted"));
});

export const adminSendOtpForPassword = asyncHandler(async (req, res) => {
  const result = await adminSendOtpForPasswordService(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "OTP sent successfully"));
});

export const adminVerifyOtpForPassword = asyncHandler(async (req, res) => {
  const result = await adminVerifyOtpForPasswordService(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "OTP verified successfully"));
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const result = await adminResetPasswordService(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Password reset successfully"));
});

export const adminProfile = asyncHandler(async (req, res) => {
  const result = await getAdminProfileService(req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Admin profile fetched successfully"));
});

export const editAdminProfile = asyncHandler(async (req, res) => {
  const result = await editAdminProfileService(req.user?._id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Admin profile updated successfully"));
});