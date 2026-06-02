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

/** Start of local calendar day (registration open through end of that day). */
export const startOfLocalDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Skater event lists: State always (if not pending delete);
 * Club/District only after admin approval; registration still open (registerEndDate >= today).
 */
export const skaterListableEventsFilter = (now = new Date()) => ({
  deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
  // Compare calendar dates (IST) so date-only registerEndDate values match correctly.
  $expr: {
    $gte: [
      {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$registerEndDate",
          timezone: "Asia/Kolkata",
        },
      },
      {
        $dateToString: {
          format: "%Y-%m-%d",
          date: now,
          timezone: "Asia/Kolkata",
        },
      },
    ],
  },
  $or: [
    { eventType: "State" },
    {
      eventType: { $in: ["Club", "District"] },
      adminApprovalStatus: {
        $in: [EVENT_ADMIN_APPROVAL.APPROVED, "Approved"],
      },
    },
  ],
});

export const isRegistrationOpen = (registerEndDate, now = new Date()) => {
  if (!registerEndDate) {
    return false;
  }
  const end = new Date(registerEndDate);
  if (Number.isNaN(end.getTime())) {
    return false;
  }
  return end >= startOfLocalDay(now);
};

export const isEventPubliclyVisible = (event) => {
  if (!event) return false;
  if (event.deleteApprovalStatus === EVENT_DELETE_APPROVAL.PENDING) {
    return false;
  }
  if (event.eventType === "State") {
    return true;
  }
  const status = String(event.adminApprovalStatus || "").toLowerCase();
  return status === EVENT_ADMIN_APPROVAL.APPROVED;
};

export const initialAdminApprovalStatus = (eventType) =>
  requiresAdminApprovalOnCreate(eventType)
    ? EVENT_ADMIN_APPROVAL.PENDING
    : EVENT_ADMIN_APPROVAL.APPROVED;
