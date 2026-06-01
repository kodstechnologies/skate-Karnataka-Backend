import mongoose from "mongoose";
import admin from "../../firebase/firebase.js";
import { BaseAuth } from "../../modules/auth/baseAuth.model.js";
import {
  getStateLevelRecipientIds,
  saveNotificationRepositories,
} from "../../modules/notification/notification.repositories.js";
import { Skater } from "../../modules/skater/skater.model.js";
import { Club } from "../../modules/club/club.model.js";
import { District } from "../../modules/district/district.model.js";

const formatNotificationDate = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const buildNewEventNotificationBody = (orgName, event) => {
  const eventTitle = (event.header || "New event").trim();
  const registerBy = formatNotificationDate(event.registerEndDate);
  const eventStart = formatNotificationDate(event.eventStartDate);

  if (registerBy && eventStart) {
    return `${orgName} invites you to "${eventTitle}" (${eventStart}) — register by ${registerBy}. Tap to view and sign up!`;
  }
  if (registerBy) {
    return `${orgName} invites you to "${eventTitle}" — register by ${registerBy}. Tap to view and sign up!`;
  }
  if (eventStart) {
    return `${orgName} posted "${eventTitle}" on ${eventStart}. Open the app to view details and register!`;
  }
  return `${orgName} posted "${eventTitle}". Open the app to view details and register!`;
};

const sendEventNotifications = async ({
  receiverIds,
  title,
  body,
  sentBy,
  data,
  notificationType = "event",
}) => {
  if (!receiverIds.length) return;

  await Promise.all(
    receiverIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title,
        body,
        notificationType,
        sentBy,
        data,
      }).catch((err) => {
        console.error(
          `Event notification failed for ${receiverId}:`,
          err?.message || err
        );
      })
    )
  );
};

const normalizeObjectId = (value) => {
  const raw = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const resolveNotificationReceiver = async (receiverId) => {
  const normalizedId = normalizeObjectId(receiverId);
  if (!normalizedId) return null;

  const select = "firebaseTokens role isNotificationsEnabled isActive fullName";

  const [skater, auth] = await Promise.all([
    Skater.findById(normalizedId).select(select).lean(),
    BaseAuth.findById(normalizedId).select(select).lean(),
  ]);

  const receiver = skater || auth;
  if (!receiver) return null;

  return {
    normalizedId,
    receiver: {
      ...receiver,
      role: receiver.role || (skater ? "Skater" : "Guest"),
    },
  };
};

const resolveNotificationSender = async (sentBy) => {
  const normalizedId = normalizeObjectId(sentBy);
  if (!normalizedId) return null;
  return BaseAuth.findById(normalizedId).select("role").lean();
};

export const sendNotification = async ({
  receiverId,
  title,
  body,
  link = "",
  img = "",
  data = {},
  notificationType = "general",
  sentBy = null,
  receiverRole: receiverRoleOverride = null,
}) => {
  let savedNotification = null;

  try {
    const normalizedId = normalizeObjectId(receiverId);
    if (!normalizedId) {
      console.log(`Invalid receiver id for notification: ${receiverId}`);
      return null;
    }

    const resolved = await resolveNotificationReceiver(receiverId);
    const auth = resolved?.receiver || null;
    const sender = await resolveNotificationSender(sentBy);
    const senderRole = sender?.role || null;
    const receiverRole =
      auth?.role || receiverRoleOverride || data?.receiverRole || "Guest";

    savedNotification = await saveNotificationRepositories({
      receiverId: normalizedId,
      receiverRole,
      title,
      body,
      link,
      img,
      notificationType,
      sentBy: normalizeObjectId(sentBy) || sentBy || null,
      senderRole,
      data,
    });

    if (!auth) {
      console.log(`Notification saved (receiver not found) for ${normalizedId}`);
      return savedNotification;
    }

    const canPush =
      auth.isActive !== false &&
      auth.isNotificationsEnabled !== false &&
      auth.firebaseTokens?.length;

    if (!canPush) {
      console.log(`Notification saved (no FCM push) for ${normalizedId}`);
      return savedNotification;
    }

    const messaging = admin.messaging();
    const response = await messaging.sendEachForMulticast({
      tokens: auth.firebaseTokens,
      notification: {
        title,
        body,
      },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        notificationId: String(savedNotification._id),
        receiverId: normalizedId.toString(),
        receiverRole: String(auth.role || ""),
        senderRole: String(senderRole || ""),
        notificationType,
      },
    });

    console.log(
      `Notification sent to ${normalizedId}`,
      response.successCount
    );

    return savedNotification;
  } catch (error) {
    console.error("sendNotification error:", error.message);
    return savedNotification;
  }
};

/** Notify every active BaseAuth account listed in Club.members (after-login skater join). */
export const notifyClubMembersOnSkaterJoin = async ({
  clubDocId,
  skaterId,
  skaterName,
}) => {
  if (!clubDocId || !mongoose.Types.ObjectId.isValid(String(clubDocId))) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const club = await Club.findById(clubDocId).select("name members").lean();
  if (!club) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const memberObjectIds = (club.members || [])
    .filter((memberId) => mongoose.Types.ObjectId.isValid(String(memberId)))
    .map((memberId) => new mongoose.Types.ObjectId(String(memberId)));

  if (!memberObjectIds.length) {
    console.log(
      `Club join notify: club ${clubDocId} has no members in Club.members`
    );
    return { notifiedCount: 0, memberCount: 0 };
  }

  const clubAuthMembers = await BaseAuth.find({
    _id: { $in: memberObjectIds },
    isActive: { $ne: false },
  })
    .select("_id role fullName")
    .lean();

  const receivers = clubAuthMembers.filter(
    (member) => String(member._id) !== String(skaterId)
  );

  if (!receivers.length) {
    return { notifiedCount: 0, memberCount: memberObjectIds.length };
  }

  const clubName = (club?.name || "your club").trim();
  const skaterLabel = (skaterName || "A skater").trim();
  const title = "New skater joined your club";
  const body = `${skaterLabel} has newly joined ${clubName}. Welcome them to the club!`;

  await Promise.all(
    receivers.map((member) =>
      sendNotification({
        receiverId: member._id,
        title,
        body,
        notificationType: "announcement",
        sentBy: skaterId,
        data: {
          type: "skater_joined_club",
          clubId: String(clubDocId),
          skaterId: String(skaterId),
          skaterName: skaterLabel,
          clubName,
          memberCount: memberObjectIds.length,
        },
      }).catch((err) => {
        console.error(
          `Skater join club notification failed for ${member._id}:`,
          err?.message || err
        );
      })
    )
  );

  console.log(
    `Club join notify: club=${clubDocId}, members=${memberObjectIds.length}, notified=${receivers.length}`
  );

  return {
    notifiedCount: receivers.length,
    memberCount: memberObjectIds.length,
  };
};

/** Notify club members when a skater applies to join that club. */
export const notifyClubMembersOnSkaterJoinApply = async ({
  clubDocId,
  skaterId,
  skaterName,
}) => {
  if (!clubDocId || !mongoose.Types.ObjectId.isValid(String(clubDocId))) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const club = await Club.findById(clubDocId).select("name members").lean();
  if (!club) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const memberObjectIds = (club.members || [])
    .filter((memberId) => mongoose.Types.ObjectId.isValid(String(memberId)))
    .map((memberId) => new mongoose.Types.ObjectId(String(memberId)));

  if (!memberObjectIds.length) {
    console.log(
      `Club join apply notify: club ${clubDocId} has no members in Club.members`
    );
    return { notifiedCount: 0, memberCount: 0 };
  }

  const clubAuthMembers = await BaseAuth.find({
    _id: { $in: memberObjectIds },
    isActive: { $ne: false },
  })
    .select("_id role fullName")
    .lean();

  const receivers = clubAuthMembers.filter(
    (member) => String(member._id) !== String(skaterId)
  );

  if (!receivers.length) {
    return { notifiedCount: 0, memberCount: memberObjectIds.length };
  }

  const clubName = (club?.name || "your club").trim();
  const skaterLabel = (skaterName || "A skater").trim();
  const title = "New club join application";
  const body = `${skaterLabel} has applied to join ${clubName}. Please review and approve or reject the application.`;

  await Promise.all(
    receivers.map((member) =>
      sendNotification({
        receiverId: member._id,
        title,
        body,
        notificationType: "approval",
        sentBy: skaterId,
        data: {
          type: "skater_join_apply",
          clubId: String(clubDocId),
          skaterId: String(skaterId),
          skaterName: skaterLabel,
          clubName,
          memberCount: memberObjectIds.length,
        },
      }).catch((err) => {
        console.error(
          `Skater join apply notification failed for ${member._id}:`,
          err?.message || err
        );
      })
    )
  );

  console.log(
    `Club join apply notify: club=${clubDocId}, members=${memberObjectIds.length}, notified=${receivers.length}`
  );

  return {
    notifiedCount: receivers.length,
    memberCount: memberObjectIds.length,
  };
};

/** Notify club members when a joined skater applies to leave the club. */
export const notifyClubMembersOnSkaterLeaveApply = async ({
  clubDocId,
  skaterId,
  skaterName,
}) => {
  if (!clubDocId || !mongoose.Types.ObjectId.isValid(String(clubDocId))) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const club = await Club.findById(clubDocId).select("name members").lean();
  if (!club) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const memberObjectIds = (club.members || [])
    .filter((memberId) => mongoose.Types.ObjectId.isValid(String(memberId)))
    .map((memberId) => new mongoose.Types.ObjectId(String(memberId)));

  if (!memberObjectIds.length) {
    console.log(
      `Club leave apply notify: club ${clubDocId} has no members in Club.members`
    );
    return { notifiedCount: 0, memberCount: 0 };
  }

  const clubAuthMembers = await BaseAuth.find({
    _id: { $in: memberObjectIds },
    isActive: { $ne: false },
  })
    .select("_id role fullName")
    .lean();

  const receivers = clubAuthMembers.filter(
    (member) => String(member._id) !== String(skaterId)
  );

  if (!receivers.length) {
    return { notifiedCount: 0, memberCount: memberObjectIds.length };
  }

  const clubName = (club?.name || "your club").trim();
  const skaterLabel = (skaterName || "A skater").trim();
  const title = "Skater leave request";
  const body = `${skaterLabel} has requested to leave ${clubName}. Please review and approve or reject the request.`;

  await Promise.all(
    receivers.map((member) =>
      sendNotification({
        receiverId: member._id,
        title,
        body,
        notificationType: "approval",
        sentBy: skaterId,
        data: {
          type: "skater_leave_apply",
          clubId: String(clubDocId),
          skaterId: String(skaterId),
          skaterName: skaterLabel,
          clubName,
          memberCount: memberObjectIds.length,
        },
      }).catch((err) => {
        console.error(
          `Skater leave apply notification failed for ${member._id}:`,
          err?.message || err
        );
      })
    )
  );

  console.log(
    `Club leave apply notify: club=${clubDocId}, members=${memberObjectIds.length}, notified=${receivers.length}`
  );

  return {
    notifiedCount: receivers.length,
    memberCount: memberObjectIds.length,
  };
};

/** Notify all joined skaters in a club when a new club event is created. */
export const notifyClubSkatersOfNewEvent = async ({
  clubAuthUserId,
  clubDocId,
  clubName,
  event,
}) => {
  const skaters = await Skater.find({
    club: clubDocId,
    clubStatus: { $in: ["join", "apply-leave"] },
    isActive: true,
    isNotificationsEnabled: { $ne: false },
  })
    .select("_id")
    .lean();

  if (!skaters.length) return;

  await sendEventNotifications({
    receiverIds: skaters.map((skater) => skater._id),
    title: "New club event",
    body: buildNewEventNotificationBody(clubName, event),
    sentBy: clubAuthUserId,
    data: {
      type: "club_event_created",
      eventId: String(event._id),
      clubId: String(clubDocId),
      eventType: "Club",
    },
  });
};

/** Notify district members, all club members in the district, and all joined skaters in those clubs. */
export const notifyDistrictMembersOfNewEvent = async ({
  districtAuthUserId,
  districtDocId,
  districtName,
  event,
}) => {
  const district = await District.findById(districtDocId).select("members").lean();

  const clubs = await Club.find({ district: districtDocId }).select("members").lean();
  const clubIds = clubs.map((club) => club._id);

  const skaters = clubIds.length
    ? await Skater.find({
        club: { $in: clubIds },
        clubStatus: { $in: ["join", "apply-leave"] },
        isActive: true,
        isNotificationsEnabled: { $ne: false },
      })
        .select("_id")
        .lean()
    : [];

  const targetUserIds = [
    ...(district?.members || []).map((id) => id.toString()),
    ...clubs.flatMap((club) => (club.members || []).map((id) => id.toString())),
    ...skaters.map((skater) => skater._id.toString()),
  ];

  const uniqueUserIds = [...new Set(targetUserIds)];
  if (!uniqueUserIds.length) return;

  await sendEventNotifications({
    receiverIds: uniqueUserIds,
    title: "New district event",
    body: buildNewEventNotificationBody(districtName, event),
    sentBy: districtAuthUserId,
    data: {
      type: "district_event_created",
      eventId: String(event._id),
      districtId: String(districtDocId),
      eventType: "District",
    },
  });
};

/** Notify state accounts, all district/club members, and all joined skaters statewide. */
export const notifyStateMembersOfNewEvent = async ({
  creatorUserId,
  stateDocId,
  stateName,
  event,
}) => {
  const [stateLevelUserIds, districts, clubs] = await Promise.all([
    getStateLevelRecipientIds(),
    District.find().select("members").lean(),
    Club.find().select("members").lean(),
  ]);

  const clubIds = clubs.map((club) => club._id);

  const skaters = clubIds.length
    ? await Skater.find({
        club: { $in: clubIds },
        clubStatus: { $in: ["join", "apply-leave"] },
        isActive: true,
        isNotificationsEnabled: { $ne: false },
      })
        .select("_id")
        .lean()
    : [];

  const targetUserIds = [
    ...stateLevelUserIds,
    ...districts.flatMap((district) =>
      (district.members || []).map((id) => id.toString())
    ),
    ...clubs.flatMap((club) =>
      (club.members || []).map((id) => id.toString())
    ),
    ...skaters.map((skater) => skater._id.toString()),
  ];

  const uniqueUserIds = [...new Set(targetUserIds)];
  if (!uniqueUserIds.length) return;

  await sendEventNotifications({
    receiverIds: uniqueUserIds,
    title: "New state event",
    body: buildNewEventNotificationBody(stateName, event),
    sentBy: creatorUserId,
    data: {
      type: "state_event_created",
      eventId: String(event._id),
      stateId: String(stateDocId),
      eventType: "State",
    },
  });
};

/** Notify state portal users and super admin when a club/district event needs approval. */
export const notifyStateLevelOnEventPendingApproval = async ({
  event,
  eventType,
  orgName,
  sentBy,
}) => {
  const recipientIds = await getStateLevelRecipientIds();
  if (!recipientIds.length) return;

  const eventTitle = (event?.header || "New event").trim();
  const orgLabel = (orgName || eventType || "Organizer").trim();
  const typeLabel = eventType === "District" ? "District" : "Club";

  await sendEventNotifications({
    receiverIds: recipientIds,
    title: `${typeLabel} event pending approval`,
    body: `${orgLabel} submitted "${eventTitle}" for your review. Open the portal to approve or reject.`,
    sentBy,
    notificationType: "approval",
    data: {
      type: "event_pending_approval",
      eventId: String(event._id),
      eventType: typeLabel,
      orgName: orgLabel,
    },
  });
};

/** Notify skater when State or Admin fully approves certification. */
export const notifySkaterCertificationApproved = async ({
  receiverId,
  sentBy,
  role,
  eventName,
  actorName,
  participantId,
  eventId,
}) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole !== "state" && normalizedRole !== "admin") {
    return;
  }

  const eventLabel = (eventName || "").trim() || "your event";
  const byLabel = (actorName || "").trim() || "the reviewer";
  const isAdmin = normalizedRole === "admin";

  await sendNotification({
    receiverId,
    title: "Certification fully approved",
    body: `Your certification application for "${eventLabel}" was fully approved by ${byLabel}. Congratulations!`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "certification_approved",
      code: isAdmin ? "APPROVED_BY_ADMIN" : "APPROVED_BY_STATE",
      approvedByRole: isAdmin ? "Admin" : "State",
      approvedByName: byLabel,
      participantId: participantId ? String(participantId) : "",
      eventId: eventId ? String(eventId) : "",
      eventName: eventLabel,
    },
  });
};

/** Notify skater when club approves their join application. */
export const notifySkaterOnClubJoinApproved = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
}) => {
  if (!skaterId) return;

  const label = (clubName || "your club").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "Club join approved",
    body: `Your application to join ${label} has been approved. Welcome to the club!`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "club_join_approved",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
    },
  }).catch((err) => {
    console.error("Club join approved skater notification failed:", err?.message || err);
  });
};

/** Notify skater when club rejects their join application. */
export const notifySkaterOnClubJoinRejected = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
}) => {
  if (!skaterId) return;

  const label = (clubName || "the club").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "Club join rejected",
    body: `Your application to join ${label} was rejected. You may apply to another club.`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "club_join_rejected",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
    },
  }).catch((err) => {
    console.error("Club join rejected skater notification failed:", err?.message || err);
  });
};

/** Notify skater when club approves their leave request. */
export const notifySkaterOnClubLeaveApproved = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
}) => {
  if (!skaterId) return;

  const label = (clubName || "your club").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "Club leave approved",
    body: `Your request to leave ${label} has been approved.`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "club_leave_approved",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
    },
  }).catch((err) => {
    console.error("Club leave approved skater notification failed:", err?.message || err);
  });
};

/** Notify skater when club rejects their leave request. */
export const notifySkaterOnClubLeaveRejected = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
}) => {
  if (!skaterId) return;

  const label = (clubName || "your club").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "Club leave rejected",
    body: `Your request to leave ${label} was rejected. You remain a member of the club.`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "club_leave_rejected",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
    },
  }).catch((err) => {
    console.error("Club leave rejected skater notification failed:", err?.message || err);
  });
};

/** Notify club members when a skater requests an RSFI ID change. */
export const notifyClubMembersOnSkaterRsfiChangeApply = async ({
  clubDocId,
  skaterId,
  skaterName,
  currentRsfiId,
  requestedRsfiId,
}) => {
  if (!clubDocId || !mongoose.Types.ObjectId.isValid(String(clubDocId))) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const club = await Club.findById(clubDocId).select("name members").lean();
  if (!club) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const memberObjectIds = (club.members || [])
    .filter((memberId) => mongoose.Types.ObjectId.isValid(String(memberId)))
    .map((memberId) => new mongoose.Types.ObjectId(String(memberId)));

  if (!memberObjectIds.length) {
    return { notifiedCount: 0, memberCount: 0 };
  }

  const clubAuthMembers = await BaseAuth.find({
    _id: { $in: memberObjectIds },
    isActive: { $ne: false },
  })
    .select("_id role fullName")
    .lean();

  const receivers = clubAuthMembers.filter(
    (member) => String(member._id) !== String(skaterId)
  );

  if (!receivers.length) {
    return { notifiedCount: 0, memberCount: memberObjectIds.length };
  }

  const clubName = (club?.name || "your club").trim();
  const skaterLabel = (skaterName || "A skater").trim();
  const fromId = (currentRsfiId || "—").trim() || "—";
  const toId = (requestedRsfiId || "").trim();
  const title = "RSFI ID change request";
  const body = `${skaterLabel} requested to change RSFI ID from ${fromId} to ${toId}. Please review in pending approvals.`;

  await Promise.all(
    receivers.map((member) =>
      sendNotification({
        receiverId: member._id,
        title,
        body,
        notificationType: "approval",
        sentBy: skaterId,
        data: {
          type: "skater_rsfi_change_apply",
          clubId: String(clubDocId),
          skaterId: String(skaterId),
          skaterName: skaterLabel,
          clubName,
          currentRsfiId: fromId,
          requestedRsfiId: toId,
        },
      }).catch((err) => {
        console.error(
          `Skater RSFI change apply notification failed for ${member._id}:`,
          err?.message || err
        );
      })
    )
  );

  return {
    notifiedCount: receivers.length,
    memberCount: memberObjectIds.length,
  };
};

export const notifySkaterOnRsfiChangeApproved = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
  requestedRsfiId,
}) => {
  if (!skaterId) return;

  const label = (clubName || "your club").trim();
  const rsfiLabel = (requestedRsfiId || "").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "RSFI ID change approved",
    body: `Your club (${label}) approved your RSFI ID change${rsfiLabel ? ` to ${rsfiLabel}` : ""}.`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "skater_rsfi_change_approved",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
      requestedRsfiId: rsfiLabel,
    },
  }).catch((err) => {
    console.error("RSFI change approved skater notification failed:", err?.message || err);
  });
};

export const notifySkaterOnRsfiChangeRejected = async ({
  skaterId,
  sentBy,
  clubDocId,
  clubName,
}) => {
  if (!skaterId) return;

  const label = (clubName || "your club").trim();

  await sendNotification({
    receiverId: skaterId,
    title: "RSFI ID change rejected",
    body: `Your RSFI ID change request was rejected by ${label}. You may submit a new request from your profile.`,
    notificationType: "approval",
    sentBy,
    data: {
      type: "skater_rsfi_change_rejected",
      clubId: clubDocId ? String(clubDocId) : "",
      clubName: label,
    },
  }).catch((err) => {
    console.error("RSFI change rejected skater notification failed:", err?.message || err);
  });
};