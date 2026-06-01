import { AppError } from "../../util/common/AppError.js";

export const MEMBER_PENDING_STATE_APPROVAL_MESSAGE =
  "Your account is pending approval by the state administrator. Please contact the KRSA state admin to approve your access.";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const isStateOrAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "state" || normalized === "admin" || normalized === "superadmin";
};

/** State/admin-created members are approved immediately; club/district org creators get pending. */
export const resolveMemberVerifyOnCreate = (creatorRole) => {
  return isStateOrAdminRole(creatorRole);
};

/**
 * Club and District accounts must be approved (verify: true) before login or API access.
 */
export const assertMemberApprovedCanLogin = async (user) => {
  if (!user?._id) {
    return;
  }

  const role = normalizeRole(user.role);
  if (role !== "club" && role !== "district") {
    return;
  }

  if (user.verify !== true) {
    throw new AppError(MEMBER_PENDING_STATE_APPROVAL_MESSAGE, 401);
  }
};

export const getMemberLoginError = async (user) => {
  try {
    await assertMemberApprovedCanLogin(user);
    return null;
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
};
