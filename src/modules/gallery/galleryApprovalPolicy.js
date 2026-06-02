/** Club and district media require super-admin approval before skaters can see them. */

export const MEDIA_ADMIN_APPROVAL = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const MEDIA_DELETE_APPROVAL = {
  PENDING: "pending",
};

export const requiresMediaApproval = (ownerType) => {
  const type = String(ownerType || "").trim().toLowerCase();
  return type === "club" || type === "district";
};

export const isStateOrAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "state" || normalized === "admin" || normalized === "superadmin";
};

export const initialMediaApprovalStatus = (ownerType) =>
  requiresMediaApproval(ownerType)
    ? MEDIA_ADMIN_APPROVAL.PENDING
    : MEDIA_ADMIN_APPROVAL.APPROVED;

/** Mongo filter: media visible to skaters. */
export const approvedPublicMediaFilter = () => ({
  deleteApprovalStatus: { $ne: MEDIA_DELETE_APPROVAL.PENDING },
  $or: [
    { ownerType: { $in: ["state", "admin"] } },
    { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.APPROVED },
    {
      ownerType: { $in: ["club", "district"] },
      adminApprovalStatus: { $exists: false },
    },
  ],
});

export const isMediaPubliclyVisible = (item) => {
  if (!item) return false;
  if (item.deleteApprovalStatus === MEDIA_DELETE_APPROVAL.PENDING) {
    return false;
  }
  if (!requiresMediaApproval(item.ownerType)) {
    return true;
  }
  const status = item.adminApprovalStatus;
  return !status || status === MEDIA_ADMIN_APPROVAL.APPROVED;
};
