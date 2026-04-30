import { AppError } from "../../util/common/AppError.js";
import { generateAccessToken, generateRefreshToken } from "../../util/token/token.js";
import {
  addRefreshTokenToAdmin,
  addMemberToDistrict,
  addMemberToClub,
  addClubToDistrict,
  createClubByAdmin,
  createClubMember,
  createDistrictByAdmin,
  createDistrictMember,
  deleteClubByIdForAdmin,
  deleteClubMemberById,
  deleteDistrictMemberById,
  deleteDistrictByIdForAdmin,
  findClubByIdForAdmin,
  findClubMemberById,
  findClubMemberByPhoneOrEmail,
  findClubByNameAndDistrict,
  findDistrictById,
  findDistrictMemberById,
  findDistrictMemberByPhoneOrEmail,
  findDistrictByName,
  deleteAdminPasswordResetOtp,
  findDistrictNameById,
  findAdminProfileById,
  getAllDistrictMembers,
  getDistrictMembersByDistrictId,
  getClubMembersByClubId,
  getAllClubsForAdmin,
  getAllDistrictsForAdmin,
  findAdminByEmail,
  getAdminPasswordResetOtp,
  markAdminPasswordOtpVerified,
  removeMemberFromDistrict,
  removeClubFromDistrict,
  removeClubMemberFromAllClubs,
  removeRefreshTokenFromAdmin,
  updateDistrictByIdForAdmin,
  updateDistrictMemberById,
  updateClubByIdForAdmin,
  updateClubMemberById,
  updateAdminProfileById,
  updateAdminPasswordByEmail,
  upsertAdminPasswordResetOtp,
} from "./admin.repositories.js";

export const adminLoginService = async ({ email, password }) => {
  const admin = await findAdminByEmail(email);

  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  const isPasswordValid = admin?.password?.includes(":")
    ? await admin.isPasswordCorrect(password)
    : admin.password === password;

  if (!isPasswordValid) {
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

export const getAdminProfileService = async (adminId) => {
  const profile = await findAdminProfileById(adminId);

  if (!profile) {
    throw new AppError("Admin profile not found", 404);
  }


  return {
    ...profile,
    img: profile?.img || "",

  };
};

export const editAdminProfileService = async (adminId, payload) => {
  const updatedProfile = await updateAdminProfileById(adminId, payload);

  if (!updatedProfile) {
    throw new AppError("Admin profile not found", 404);
  }


  return {
    ...updatedProfile,
    img: updatedProfile?.img || "",

  };
};

export const getAllDistrictsByAdminService = async ({ page, limit, name }) => {
  return getAllDistrictsForAdmin({ page, limit, name });
};

export const createDistrictByAdminService = async (payload) => {
  const existingDistrict = await findDistrictByName(payload.name);
  if (existingDistrict) {
    throw new AppError("District already exists", 409);
  }

  const district = await createDistrictByAdmin(payload);
  return {
    _id: district._id,
    name: district.name,
  };
};

export const updateDistrictByAdminService = async (districtId, payload) => {
  const district = await findDistrictById(districtId);
  if (!district) {
    throw new AppError("District not found", 404);
  }

  if (payload?.name && payload.name.trim() !== district.name) {
    const existingDistrict = await findDistrictByName(payload.name);
    if (existingDistrict && String(existingDistrict._id) !== String(districtId)) {
      throw new AppError("District already exists", 409);
    }
  }

  const updatedDistrict = await updateDistrictByIdForAdmin(districtId, payload);
  return updatedDistrict;
};

export const deleteDistrictByAdminService = async (districtId) => {
  const district = await findDistrictById(districtId);
  if (!district) {
    throw new AppError("District not found", 404);
  }

  if ((district.members || []).length > 0) {
    throw new AppError("District has members, cannot delete", 400);
  }

  await deleteDistrictByIdForAdmin(districtId);
  return { deleted: true };
};

export const getAllDistrictMembersByAdminService = async () => {
  return getAllDistrictMembers();
};

export const getDistrictMembersByDistrictIdByAdminService = async (districtId) => {
  const district = await findDistrictById(districtId);
  if (!district) {
    throw new AppError("District not found", 404);
  }

  return getDistrictMembersByDistrictId(districtId);
};

export const createDistrictMemberByAdminService = async (payload) => {
  if (!payload?.district) {
    throw new AppError("District id is required", 400);
  }

  const district = await findDistrictById(payload.district);
  if (!district) {
    throw new AppError("District not found", 404);
  }
  const existingMember = await findDistrictMemberByPhoneOrEmail({
    phone: payload.phone,
    email: payload.email,
  });
  if (existingMember) {
    throw new AppError("District member already exists with phone or email", 409);
  }

  const member = await createDistrictMember(payload);
  await addMemberToDistrict({ districtId: payload.district, memberId: member._id });

  return {
    _id: member._id,
    fullName: member.fullName,
    phone: member.phone,
    role: member.role,
  };
};

export const updateDistrictMemberByAdminService = async (districtMemberId, payload) => {
  const existingMember = await findDistrictMemberById(districtMemberId);
  if (!existingMember) {
    throw new AppError("District member not found", 404);
  }

  if (payload?.phone || payload?.email) {
    const duplicate = await findDistrictMemberByPhoneOrEmail({
      phone: payload.phone,
      email: payload.email,
    });
    if (duplicate && String(duplicate._id) !== String(districtMemberId)) {
      throw new AppError("Phone or email already in use", 409);
    }
  }

  if (payload?.district) {
    const targetDistrict = await findDistrictById(payload.district);
    if (!targetDistrict) {
      throw new AppError("Target district not found", 404);
    }
  }

  const updatedMember = await updateDistrictMemberById(districtMemberId, payload);
  if (!updatedMember) {
    throw new AppError("District member not found", 404);
  }

  const oldDistrictId = existingMember?.district ? String(existingMember.district) : "";
  const newDistrictId = updatedMember?.district?._id
    ? String(updatedMember.district._id)
    : updatedMember?.district
      ? String(updatedMember.district)
      : "";

  if (oldDistrictId && oldDistrictId !== newDistrictId) {
    await removeMemberFromDistrict({ districtId: oldDistrictId, memberId: districtMemberId });
  }

  if (newDistrictId && oldDistrictId !== newDistrictId) {
    await addMemberToDistrict({ districtId: newDistrictId, memberId: districtMemberId });
  }

  return updatedMember;
};

export const deleteDistrictMemberByAdminService = async (districtMemberId) => {
  const existingMember = await findDistrictMemberById(districtMemberId);
  if (!existingMember) {
    throw new AppError("District member not found", 404);
  }

  await deleteDistrictMemberById(districtMemberId);

  if (existingMember.district) {
    await removeMemberFromDistrict({
      districtId: existingMember.district,
      memberId: districtMemberId,
    });
  }

  return { deleted: true };
};

export const getAllClubByAdminService = async () => {
  return getAllClubsForAdmin();
};

export const createClubByAdminService = async (payload) => {
  const district = await findDistrictById(payload?.district);
  if (!district) {
    throw new AppError("District not found", 404);
  }

  const existingClub = await findClubByNameAndDistrict({
    name: payload.name,
    district: payload.district,
  });
  if (existingClub) {
    throw new AppError("Club already exists in this district", 409);
  }

  const club = await createClubByAdmin(payload);
  await addClubToDistrict({ districtId: payload.district, clubId: club._id });

  return {
    _id: club._id,
    clubId: club.clubId,
    name: club.name,
  };
};

export const updateClubByAdminService = async (clubId, payload) => {
  const existingClub = await findClubByIdForAdmin(clubId);
  if (!existingClub) {
    throw new AppError("Club not found", 404);
  }

  const targetDistrictId = payload?.district || existingClub?.district;
  const district = await findDistrictById(targetDistrictId);
  if (!district) {
    throw new AppError("District not found", 404);
  }

  if (payload?.name || payload?.district) {
    const duplicateClub = await findClubByNameAndDistrict({
      name: payload?.name || existingClub.name,
      district: targetDistrictId,
    });
    if (duplicateClub && String(duplicateClub._id) !== String(clubId)) {
      throw new AppError("Club already exists in this district", 409);
    }
  }

  const updatedClub = await updateClubByIdForAdmin(clubId, payload);
  if (!updatedClub) {
    throw new AppError("Club not found", 404);
  }

  const oldDistrictId = existingClub?.district ? String(existingClub.district) : "";
  const newDistrictId = updatedClub?.district?._id
    ? String(updatedClub.district._id)
    : updatedClub?.district
      ? String(updatedClub.district)
      : "";

  if (oldDistrictId && oldDistrictId !== newDistrictId) {
    await removeClubFromDistrict({ districtId: oldDistrictId, clubId });
  }
  if (newDistrictId && oldDistrictId !== newDistrictId) {
    await addClubToDistrict({ districtId: newDistrictId, clubId });
  }

  return updatedClub;
};

export const deleteClubByAdminService = async (clubId) => {
  const existingClub = await findClubByIdForAdmin(clubId);
  if (!existingClub) {
    throw new AppError("Club not found", 404);
  }

  if ((existingClub.members || []).length > 0) {
    throw new AppError("Club has members, cannot delete", 400);
  }

  await deleteClubByIdForAdmin(clubId);

  if (existingClub.district) {
    await removeClubFromDistrict({ districtId: existingClub.district, clubId });
  }

  return { deleted: true };
};

export const getClubMembersByClubIdByAdminService = async (clubId) => {
  const club = await findClubByIdForAdmin(clubId);
  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const clubMembers = await getClubMembersByClubId(clubId);
  return clubMembers;
};

export const createClubMemberByAdminService = async ({ clubId, payload }) => {
  const club = await findClubByIdForAdmin(clubId);
  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const existingMember = await findClubMemberByPhoneOrEmail({
    phone: payload.phone,
    email: payload.email,
  });
  if (existingMember) {
    throw new AppError("Club member already exists with phone or email", 409);
  }

  const member = await createClubMember({
    ...payload,
    district: club?.district || undefined,
  });
  await addMemberToClub({ clubId, memberId: member._id });

  return {
    _id: member._id,
    fullName: member.fullName,
    phone: member.phone,
    role: member.role,
  };
};

export const updateClubMemberByAdminService = async (clubMemberId, payload) => {
  const existingMember = await findClubMemberById(clubMemberId);
  if (!existingMember) {
    throw new AppError("Club member not found", 404);
  }

  if (payload?.phone || payload?.email) {
    const duplicate = await findClubMemberByPhoneOrEmail({
      phone: payload.phone,
      email: payload.email,
    });
    if (duplicate && String(duplicate._id) !== String(clubMemberId)) {
      throw new AppError("Phone or email already in use", 409);
    }
  }

  const updatedMember = await updateClubMemberById(clubMemberId, payload);
  if (!updatedMember) {
    throw new AppError("Club member not found", 404);
  }

  return updatedMember;
};

export const deleteClubMemberByAdminService = async (clubMemberId) => {
  const existingMember = await findClubMemberById(clubMemberId);
  if (!existingMember) {
    throw new AppError("Club member not found", 404);
  }

  await deleteClubMemberById(clubMemberId);
  await removeClubMemberFromAllClubs(clubMemberId);

  return { deleted: true };
};
