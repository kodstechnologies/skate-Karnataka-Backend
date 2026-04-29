import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  adminForgotPasswordService,
  adminLoginService,
  adminLogoutService,
  adminResetPasswordService,
  adminSendOtpForPasswordService,
  createDistrictByAdminService,
  createDistrictMemberByAdminService,
  deleteDistrictMemberByAdminService,
  deleteDistrictByAdminService,
  editAdminProfileService,
  getAllDistrictMembersByAdminService,
  getAllDistrictsByAdminService,
  getAdminProfileService,
  updateDistrictMemberByAdminService,
  updateDistrictByAdminService,
  adminVerifyOtpForPasswordService,
} from "./admin.service.js";

export const adminLogin = asyncHandler(async (req, res) => {
  const result = await adminLoginService(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        admin: result.admin,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      "Admin logged in successfully"
    )
  );
});

export const adminLogout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  const result = await adminLogoutService({
    adminId: req.user?._id,
    refreshToken,
  });

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

export const getAllDistrictsByAdmin = asyncHandler(async (_req, res) => {
  const result = await getAllDistrictsByAdminService();

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Districts fetched successfully"));
});

export const createDistrictByAdmin = asyncHandler(async (req, res) => {
  const result = await createDistrictByAdminService(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, result, "District created successfully"));
});

export const updateDistrictByAdmin = asyncHandler(async (req, res) => {
  const result = await updateDistrictByAdminService(req.params.id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "District updated successfully"));
});

export const deleteDistrictByAdmin = asyncHandler(async (req, res) => {
  const result = await deleteDistrictByAdminService(req.params.id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "District deleted successfully"));
});

export const getAllDistrictMembersByAdmin = asyncHandler(async (_req, res) => {
  const result = await getAllDistrictMembersByAdminService();

  return res
    .status(200)
    .json(new ApiResponse(200, result, "District members fetched successfully"));
});

export const createDistrictMemberByAdmin = asyncHandler(async (req, res) => {
  const result = await createDistrictMemberByAdminService(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, result, "District member created successfully"));
});

export const updateDistrictMemberByAdmin = asyncHandler(async (req, res) => {
  const result = await updateDistrictMemberByAdminService(req.params.id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "District member updated successfully"));
});

export const deleteDistrictMemberByAdmin = asyncHandler(async (req, res) => {
  const result = await deleteDistrictMemberByAdminService(req.params.id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "District member deleted successfully"));
});