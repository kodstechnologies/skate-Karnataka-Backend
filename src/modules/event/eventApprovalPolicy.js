/** Club and district events require super-admin (Admin/State) approval before public display. */

export const EVENT_ADMIN_APPROVAL = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const EVENT_DELETE_APPROVAL = {
  PENDING: "pending",
};

export const requiresAdminApprovalOnCreate = (eventType) => {
  const type = String(eventType || "").trim();
  return type === "Club" || type === "District";
};

export const isStateOrAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "state" || normalized === "admin" || normalized === "superadmin";
};

/** Mongo filter: events visible to skaters / registration lists (approved only). */
export const approvedPublicEventFilter = () => ({
  deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
  $or: [
    { eventType: "State" },
    { adminApprovalStatus: EVENT_ADMIN_APPROVAL.APPROVED },
    {
      eventType: { $in: ["Club", "District"] },
      adminApprovalStatus: { $exists: false },
    },
  ],
});

export const isEventPubliclyVisible = (event) => {
  if (!event) return false;
  if (event.deleteApprovalStatus === EVENT_DELETE_APPROVAL.PENDING) {
    return false;
  }
  if (event.eventType === "State") {
    return true;
  }
  const status = event.adminApprovalStatus;
  return !status || status === EVENT_ADMIN_APPROVAL.APPROVED;
};

export const initialAdminApprovalStatus = (eventType) =>
  requiresAdminApprovalOnCreate(eventType)
    ? EVENT_ADMIN_APPROVAL.PENDING
    : EVENT_ADMIN_APPROVAL.APPROVED;
