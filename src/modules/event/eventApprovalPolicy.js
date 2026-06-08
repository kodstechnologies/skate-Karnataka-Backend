/** Club, district, and state events require admin approval before public display. */

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
  return type === "Club" || type === "District" || type === "State";
};

export const isStateOrAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "state" || normalized === "admin" || normalized === "superadmin";
};

export const isAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
};

/** State events are approved by Admin only; club/district by Admin or State. */
export const canReviewerApproveEventType = (eventType, reviewerRole) => {
  const type = String(eventType || "").trim();
  const role = String(reviewerRole || "").trim().toLowerCase();
  if (type === "State") {
    return isAdminRole(role);
  }
  return isStateOrAdminRole(role);
};

/** Mongo filter: events visible to skaters / registration lists (approved only). */
export const approvedPublicEventFilter = () => ({
  deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
  $or: [
    { adminApprovalStatus: EVENT_ADMIN_APPROVAL.APPROVED },
    { adminApprovalStatus: { $exists: false } },
  ],
});

/** Start of local calendar day (registration open through end of that day). */
export const startOfLocalDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Hide events whose registerEndDate calendar day has passed (IST). */
export const registrationStillOpenFilter = (now = new Date()) => ({
  registerEndDate: { $ne: null },
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
});

/**
 * Skater event lists: approved events only; registration still open (registerEndDate >= today).
 */
export const skaterListableEventsFilter = (now = new Date()) => ({
  deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
  ...registrationStillOpenFilter(now),
  $or: [
    {
      adminApprovalStatus: {
        $in: [EVENT_ADMIN_APPROVAL.APPROVED, "Approved"],
      },
    },
    { adminApprovalStatus: { $exists: false } },
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
  const status = String(event.adminApprovalStatus || "").toLowerCase();
  return !status || status === EVENT_ADMIN_APPROVAL.APPROVED;
};

export const initialAdminApprovalStatus = (eventType, creatorRole) => {
  if (!requiresAdminApprovalOnCreate(eventType)) {
    return EVENT_ADMIN_APPROVAL.APPROVED;
  }
  if (isAdminRole(creatorRole)) {
    return EVENT_ADMIN_APPROVAL.APPROVED;
  }
  return EVENT_ADMIN_APPROVAL.PENDING;
};
