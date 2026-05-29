import mongoose from "mongoose";
import admin from "../../firebase/firebase.js";
import { BaseAuth } from "../../modules/auth/baseAuth.model.js";
import { saveNotificationRepositories } from "../../modules/notification/notification.repositories.js";
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
}) => {
  if (!receiverIds.length) return;

  await Promise.all(
    receiverIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title,
        body,
        notificationType: "event",
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

export const sendNotification = async ({
  receiverId,
  title,
  body,
  link = "",
  img = "",
  data = {},
  notificationType = "general",
  sentBy = null
}) => {
  let savedNotification = null;

  try {
    const auth = await BaseAuth.findById(receiverId)
      .select("firebaseTokens role");
    const sender = sentBy
      ? await BaseAuth.findById(sentBy).select("role")
      : null;
    const senderRole = sender?.role || null;

    if (!auth) {
      console.log(`Receiver not found: ${receiverId}`);
      return null;
    }

    savedNotification = await saveNotificationRepositories({
      receiverId,
      receiverRole: auth.role,
      title,
      body,
      link,
      img,
      notificationType,
      sentBy,
      senderRole,
      data,
    });

    if (!auth.firebaseTokens?.length) {
      console.log(`Notification saved (no FCM tokens) for ${receiverId}`);
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
        receiverId: receiverId.toString(),
        receiverRole: String(auth.role || ""),
        senderRole: String(senderRole || ""),
        notificationType,
      },
    });

    console.log(
      `Notification sent to ${receiverId}`,
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
  const [stateUsers, districts, clubs] = await Promise.all([
    BaseAuth.find({
      role: "State",
      isActive: true,
      isNotificationsEnabled: { $ne: false },
    })
      .select("_id")
      .lean(),
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
    ...stateUsers.map((user) => user._id.toString()),
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