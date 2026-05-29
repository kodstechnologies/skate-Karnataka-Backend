import { sendNotification } from "../../util/firebase/sendNotification.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { Report } from "./report.model.js";

export const REPORT_DISTRICT_ESCALATION_MS = 15 * 24 * 60 * 60 * 1000;
export const REPORT_STATE_ESCALATION_MS = 30 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

const OPEN_STATUSES = ["pending", "inprogress"];

const reportLabel = (report) =>
  (report?.reportType || "report").trim() || "report";

const skaterLabel = (report) =>
  (report?.skaterName || report?.krsaId || "A skater").trim();

const isOpenStatus = (value) => OPEN_STATUSES.includes(String(value || "").trim());

const isSkaterReportOpen = (report) => report?.status !== "solved";

const reportAgeMs = (report) => {
  const createdAt = report?.createdAt ? new Date(report.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return 0;
  return Date.now() - createdAt.getTime();
};

const notifyMany = async ({ receiverIds, sentBy, title, body, data }) => {
  const uniqueIds = [...new Set(receiverIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return;

  await Promise.all(
    uniqueIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title,
        body,
        notificationType: "report",
        sentBy,
        data,
      }).catch((err) => {
        console.error(
          `Report notification failed for ${receiverId}:`,
          err?.message || err
        );
      })
    )
  );
};

const getDistrictMemberIds = async (districtDocId) => {
  if (!districtDocId) return [];
  const district = await District.findById(districtDocId)
    .select("members")
    .lean();
  return (district?.members || []).map((id) => String(id));
};

const getStateUserIds = async () => {
  const users = await BaseAuth.find({
    role: "State",
    isActive: true,
    isNotificationsEnabled: { $ne: false },
  })
    .select("_id")
    .lean();
  return users.map((user) => String(user._id));
};

/** Skater filed report (status pending) — notify club while clubStatus is open. */
export const notifyClubOnNewReport = async ({ report, sentBy }) => {
  if (!isSkaterReportOpen(report) || !isOpenStatus(report?.clubStatus)) return;

  const clubDocId = report?.ownClub;
  if (!clubDocId) return;

  const club = await Club.findById(clubDocId).select("name members").lean();
  const memberIds = (club?.members || []).map((id) => String(id));
  if (!memberIds.length) return;

  const clubName = club?.name || report?.clubName || "your club";

  await notifyMany({
    receiverIds: memberIds,
    sentBy,
    title: "New skater report",
    body: `${skaterLabel(report)} submitted a new "${reportLabel(report)}" report for ${clubName} (status: ${report.status}). Please review.`,
    data: {
      type: "report_created",
      reportId: String(report._id),
      status: report.status,
      clubStatus: report.clubStatus,
    },
  });
};

/** Club changed clubStatus — notify skater. */
export const notifySkaterOnClubReportUpdate = async ({
  report,
  sentBy,
  clubStatus,
  message,
}) => {
  const skaterId = report?.complainedBy;
  if (!skaterId) return;

  const statusLabel = (clubStatus || report?.clubStatus || "pending").trim();
  const messageText = String(message ?? report?.clubMessage ?? "").trim();
  const typeLabel = reportLabel(report);
  const clubName = (report?.clubName || "Your club").trim();

  let body;
  if (messageText && statusLabel) {
    body = `${clubName} updated your "${typeLabel}" report. Status: ${statusLabel}. Message: ${messageText}`;
  } else if (messageText) {
    body = `${clubName} message on your "${typeLabel}" report: ${messageText}`;
  } else {
    body = `${clubName} set club status to "${statusLabel}" on your "${typeLabel}" report.`;
  }

  await sendNotification({
    receiverId: skaterId,
    title: "Report update from club",
    body,
    notificationType: "report",
    sentBy,
    data: {
      type: "report_club_updated",
      reportId: String(report._id),
      status: report.status,
      clubStatus: statusLabel,
      clubMessage: messageText,
      message: messageText,
    },
  }).catch((err) => {
    console.error("Club report skater notification failed:", err?.message || err);
  });
};

/** District changed districtStatus (or skater status) — notify skater. */
export const notifySkaterOnDistrictReportUpdate = async ({
  report,
  sentBy,
  districtStatus,
  message,
}) => {
  const skaterId = report?.complainedBy;
  if (!skaterId) return;

  const statusLabel = (districtStatus || report?.districtStatus || "pending").trim();
  const messageText = String(message ?? report?.districtMessage ?? "").trim();
  const typeLabel = reportLabel(report);

  let body;
  if (messageText && statusLabel) {
    body = `District updated your "${typeLabel}" report. Status: ${statusLabel}. Message: ${messageText}`;
  } else if (messageText) {
    body = `District message on your "${typeLabel}" report: ${messageText}`;
  } else {
    body = `District set district status to "${statusLabel}" on your "${typeLabel}" report.`;
  }

  await sendNotification({
    receiverId: skaterId,
    title: "Report update from district",
    body,
    notificationType: "report",
    sentBy,
    data: {
      type: "report_district_updated",
      reportId: String(report._id),
      status: report.status,
      districtStatus: statusLabel,
      districtMessage: messageText,
      message: messageText,
    },
  }).catch((err) => {
    console.error(
      "District report skater notification failed:",
      err?.message || err
    );
  });
};

/** State changed StateStatus — notify skater. */
export const notifySkaterOnStateReportUpdate = async ({
  report,
  sentBy,
  stateStatus,
  message,
}) => {
  const skaterId = report?.complainedBy;
  if (!skaterId) return;

  const statusLabel = (stateStatus || report?.StateStatus || "pending").trim();
  const messageText = String(message ?? report?.stateMessage ?? "").trim();
  const typeLabel = reportLabel(report);

  let body;
  if (messageText && statusLabel) {
    body = `State updated your "${typeLabel}" report. Status: ${statusLabel}. Message: ${messageText}`;
  } else if (messageText) {
    body = `State message on your "${typeLabel}" report: ${messageText}`;
  } else {
    body = `State set state status to "${statusLabel}" on your "${typeLabel}" report.`;
  }

  await sendNotification({
    receiverId: skaterId,
    title: "Report update from state",
    body,
    notificationType: "report",
    sentBy,
    data: {
      type: "report_state_updated",
      reportId: String(report._id),
      status: report.status,
      stateStatus: statusLabel,
      stateMessage: messageText,
      message: messageText,
    },
  }).catch((err) => {
    console.error("State report skater notification failed:", err?.message || err);
  });
};

/** Skater set status to solved — notify club; district/state by age + their status still open. */
export const notifyReportResolvedBySkater = async ({ report, sentBy }) => {
  if (report?.status !== "solved") return;

  const typeLabel = reportLabel(report);
  const skater = skaterLabel(report);
  const ageMs = reportAgeMs(report);

  const club = await Club.findById(report.ownClub)
    .select("name members district")
    .lean();

  if (isOpenStatus(report.clubStatus) && club?.members?.length) {
    await notifyMany({
      receiverIds: club.members.map((id) => String(id)),
      sentBy,
      title: "Report marked solved by skater",
      body: `${skater} marked "${typeLabel}" as solved (your club status: ${report.clubStatus}). Please confirm.`,
      data: {
        type: "report_skater_solved",
        reportId: String(report._id),
        status: report.status,
        clubStatus: report.clubStatus,
      },
    });
  }

  if (
    ageMs >= REPORT_DISTRICT_ESCALATION_MS &&
    isOpenStatus(report.districtStatus) &&
    club?.district
  ) {
    const districtMemberIds = await getDistrictMemberIds(club.district);
    if (districtMemberIds.length) {
      await notifyMany({
        receiverIds: districtMemberIds,
        sentBy,
        title: "Report solved by skater",
        body: `${skater} marked "${typeLabel}" solved (district status still ${report.districtStatus}, open 15+ days).`,
        data: {
          type: "report_skater_solved",
          reportId: String(report._id),
          districtStatus: report.districtStatus,
        },
      });
    }
  }

  if (ageMs >= REPORT_STATE_ESCALATION_MS && isOpenStatus(report.StateStatus)) {
    const stateUserIds = await getStateUserIds();
    if (stateUserIds.length) {
      await notifyMany({
        receiverIds: stateUserIds,
        sentBy,
        title: "Report solved by skater",
        body: `${skater} marked "${typeLabel}" solved (state status still ${report.StateStatus}, open 30+ days).`,
        data: {
          type: "report_skater_solved",
          reportId: String(report._id),
          stateStatus: report.StateStatus,
        },
      });
    }
  }
};

const buildDayWindow = (ageMs) => {
  const end = new Date(Date.now() - ageMs);
  const start = new Date(end.getTime() - DAY_MS);
  return { start, end };
};

const notifyDistrictEscalation = async (report) => {
  if (!isSkaterReportOpen(report) || !isOpenStatus(report.districtStatus)) return;

  const club = await Club.findById(report.ownClub)
    .select("name district")
    .lean();
  if (!club?.district) return;

  const district = await District.findById(club.district).select("name").lean();
  const memberIds = await getDistrictMemberIds(club.district);
  if (!memberIds.length) return;

  await notifyMany({
    receiverIds: memberIds,
    sentBy: null,
    title: "Report needs district review",
    body: `"${reportLabel(report)}" from ${skaterLabel(report)} is 15+ days old (district status: ${report.districtStatus}, skater status: ${report.status}).`,
    data: {
      type: "report_district_escalation",
      reportId: String(report._id),
      districtStatus: report.districtStatus,
      status: report.status,
    },
  });
};

const notifyStateEscalation = async (report) => {
  if (!isSkaterReportOpen(report) || !isOpenStatus(report.StateStatus)) return;

  const stateUserIds = await getStateUserIds();
  if (!stateUserIds.length) return;

  await notifyMany({
    receiverIds: stateUserIds,
    sentBy: null,
    title: "Report needs state review",
    body: `"${reportLabel(report)}" from ${skaterLabel(report)} is 30+ days old (state status: ${report.StateStatus}, skater status: ${report.status}).`,
    data: {
      type: "report_state_escalation",
      reportId: String(report._id),
      stateStatus: report.StateStatus,
      status: report.status,
    },
  });
};

/**
 * Daily job: remind district/state using status fields only (no extra flags).
 * Notifies reports that crossed 15d / 30d in the last 24h while still open at that level.
 */
export const runDailyReportEscalationJob = async () => {
  const districtWindow = buildDayWindow(REPORT_DISTRICT_ESCALATION_MS);
  const stateWindow = buildDayWindow(REPORT_STATE_ESCALATION_MS);

  const districtReports = await Report.find({
    status: { $in: OPEN_STATUSES },
    districtStatus: { $in: OPEN_STATUSES },
    createdAt: { $gt: districtWindow.start, $lte: districtWindow.end },
  })
    .select(
      "_id ownClub reportType skaterName krsaId status clubStatus districtStatus StateStatus createdAt"
    )
    .lean();

  const stateReports = await Report.find({
    status: { $in: OPEN_STATUSES },
    StateStatus: { $in: OPEN_STATUSES },
    createdAt: { $gt: stateWindow.start, $lte: stateWindow.end },
  })
    .select(
      "_id ownClub reportType skaterName krsaId status clubStatus districtStatus StateStatus createdAt"
    )
    .lean();

  for (const report of districtReports) {
    await notifyDistrictEscalation(report).catch((err) => {
      console.error(
        `District escalation failed for report ${report._id}:`,
        err?.message || err
      );
    });
  }

  for (const report of stateReports) {
    await notifyStateEscalation(report).catch((err) => {
      console.error(
        `State escalation failed for report ${report._id}:`,
        err?.message || err
      );
    });
  }

  console.log(
    `Report escalation job: district=${districtReports.length}, state=${stateReports.length}`
  );
};

export const startReportEscalationScheduler = () => {
  const run = () => {
    runDailyReportEscalationJob().catch((err) => {
      console.error("Daily report escalation job failed:", err?.message || err);
    });
  };

  setTimeout(run, 60 * 1000);
  setInterval(run, DAY_MS);
  console.log("Report escalation scheduler started (runs daily)");
};
