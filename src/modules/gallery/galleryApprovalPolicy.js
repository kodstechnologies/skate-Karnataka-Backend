/** Club, district, and state media require admin approval before skaters can see them. */

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
  return type === "club" || type === "district" || type === "state";
};

export const isStateOrAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "state" || normalized === "admin" || normalized === "superadmin";
};

export const isAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
};

/** State media is approved by Admin only; club/district by Admin or State. */
export const canReviewerApproveMediaOwner = (ownerType, reviewerRole) => {
  const type = String(ownerType || "").trim().toLowerCase();
  const role = String(reviewerRole || "").trim().toLowerCase();
  if (type === "state") {
    return isAdminRole(role);
  }
  return isStateOrAdminRole(role);
};

export const initialMediaApprovalStatus = (ownerType, uploaderRole) => {
  if (!requiresMediaApproval(ownerType)) {
    return MEDIA_ADMIN_APPROVAL.APPROVED;
  }
  if (isAdminRole(uploaderRole)) {
    return MEDIA_ADMIN_APPROVAL.APPROVED;
  }
  return MEDIA_ADMIN_APPROVAL.PENDING;
};

/** Mongo filter: media visible to skaters. */
export const approvedPublicMediaFilter = () => ({
  deleteApprovalStatus: { $ne: MEDIA_DELETE_APPROVAL.PENDING },
  $or: [
    { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.APPROVED },
    { adminApprovalStatus: { $exists: false } },
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
