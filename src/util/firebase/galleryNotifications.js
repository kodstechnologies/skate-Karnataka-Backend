import { Club } from "../../modules/club/club.model.js";
import { District } from "../../modules/district/district.model.js";
import { Skater } from "../../modules/skater/skater.model.js";
import {
  getAdminRecipientIds,
  getStateLevelRecipientIds,
} from "../../modules/notification/notification.repositories.js";
import { sendNotification } from "./sendNotification.js";

const mediaTitle = (media) => (media?.title || "Untitled media").trim();

export const resolveMediaOrgName = async (ownerType, ownerId) => {
  const type = String(ownerType || "").toLowerCase();
  if (type === "club") {
    const club = await Club.findById(ownerId).select("name").lean();
    return (club?.name || "Club").trim();
  }
  if (type === "district") {
    const district = await District.findById(ownerId).select("name").lean();
    return (district?.name || "District").trim();
  }
  return "Organization";
};

const uniqueIds = (ids) => [...new Set(ids.map((id) => String(id)).filter(Boolean))];

const getClubMemberAuthIds = async (clubDocId) => {
  const club = await Club.findById(clubDocId).select("members").lean();
  return uniqueIds(club?.members || []);
};

const getDistrictMemberAuthIds = async (districtDocId) => {
  const district = await District.findById(districtDocId).select("members").lean();
  return uniqueIds(district?.members || []);
};

const getSkaterIdsForClub = async (clubDocId) => {
  const skaters = await Skater.find({
    club: clubDocId,
    clubStatus: { $in: ["join", "apply-leave"] },
    isActive: { $ne: false },
    isNotificationsEnabled: { $ne: false },
  })
    .select("_id")
    .lean();
  return skaters.map((s) => String(s._id));
};

const getSkaterIdsForDistrict = async (districtDocId) => {
  const clubs = await Club.find({ district: districtDocId }).select("_id").lean();
  const clubIds = clubs.map((c) => c._id);
  if (!clubIds.length) return [];

  const skaters = await Skater.find({
    club: { $in: clubIds },
    clubStatus: { $in: ["join", "apply-leave"] },
    isActive: { $ne: false },
    isNotificationsEnabled: { $ne: false },
  })
    .select("_id")
    .lean();
  return skaters.map((s) => String(s._id));
};

const getOrgUploaderMemberIds = async (ownerType, ownerId) => {
  const type = String(ownerType || "").toLowerCase();
  if (type === "club") {
    return getClubMemberAuthIds(ownerId);
  }
  if (type === "district") {
    return getDistrictMemberAuthIds(ownerId);
  }
  return [];
};

const notifyMany = async ({ receiverIds, title, body, sentBy, notificationType = "approval", data = {}, link = "" }) => {
  const ids = uniqueIds(receiverIds);
  if (!ids.length) return;

  await Promise.all(
    ids.map((receiverId) =>
      sendNotification({
        receiverId,
        title,
        body,
        link,
        notificationType,
        sentBy,
        data,
      }).catch((err) => {
        console.error(`Gallery notification failed for ${receiverId}:`, err?.message || err);
      })
    )
  );
};

const buildAdminMediaLink = (ownerType, ownerId) => {
  const type = String(ownerType || "").toLowerCase();
  if (type === "club" && ownerId) {
    return `/clubs/${ownerId}/media`;
  }
  if (type === "district" && ownerId) {
    return `/districts/${ownerId}/media`;
  }
  return "/gallery/approvals";
};

/** Super admin / state: new club or district media awaiting approval. */
export const notifyStateLevelOnMediaPendingApproval = async ({ media, sentBy }) => {
  const ownerType = String(media?.ownerType || "").toLowerCase();
  const recipientIds =
    ownerType === "state"
      ? await getAdminRecipientIds()
      : await getStateLevelRecipientIds();
  if (!recipientIds.length || !media) return;

  const ownerId = media.ownerId;
  const orgName = await resolveMediaOrgName(ownerType, ownerId);
  const typeLabel =
    ownerType === "district" ? "District" : ownerType === "state" ? "State" : "Club";
  const title = `${typeLabel} media pending approval`;
  const body = `${orgName} submitted "${mediaTitle(media)}" for your review. Approve to show it to skaters in the gallery.`;

  await notifyMany({
    receiverIds: recipientIds,
    title,
    body,
    sentBy,
    link: buildAdminMediaLink(ownerType, ownerId),
    data: {
      type: "media_pending_approval",
      mediaId: String(media._id),
      ownerType: typeLabel,
      ownerId: ownerId ? String(ownerId) : "",
      orgName,
    },
  });
};

/** Super admin / state: club or district requested to delete approved media. */
export const notifyStateLevelOnMediaDeletePending = async ({ media, sentBy }) => {
  const ownerType = String(media?.ownerType || "").toLowerCase();
  const recipientIds =
    ownerType === "state"
      ? await getAdminRecipientIds()
      : await getStateLevelRecipientIds();
  if (!recipientIds.length || !media) return;

  const ownerId = media.ownerId;
  const orgName = await resolveMediaOrgName(ownerType, ownerId);
  const typeLabel =
    ownerType === "district" ? "District" : ownerType === "state" ? "State" : "Club";
  const title = `${typeLabel} media delete request`;
  const body = `${orgName} asked to remove "${mediaTitle(media)}" from the gallery. Review and approve or cancel the delete.`;

  await notifyMany({
    receiverIds: recipientIds,
    title,
    body,
    sentBy,
    link: buildAdminMediaLink(ownerType, ownerId),
    data: {
      type: "media_delete_pending",
      mediaId: String(media._id),
      ownerType: typeLabel,
      ownerId: ownerId ? String(ownerId) : "",
      orgName,
    },
  });
};

/** After approval: skaters in scope can see the media in gallery. */
export const notifySkatersOnMediaApproved = async ({ media, sentBy }) => {
  if (!media?.ownerId) return;

  const ownerType = String(media.ownerType || "").toLowerCase();
  const skaterIds =
    ownerType === "club"
      ? await getSkaterIdsForClub(media.ownerId)
      : ownerType === "district"
        ? await getSkaterIdsForDistrict(media.ownerId)
        : [];

  if (!skaterIds.length) return;

  const orgName = await resolveMediaOrgName(media.ownerType, media.ownerId);
  const title = "New gallery media";
  const body = `${orgName} shared "${mediaTitle(media)}" in the gallery. Open the app to view it.`;

  await notifyMany({
    receiverIds: skaterIds,
    title,
    body,
    sentBy,
    notificationType: "announcement",
    data: {
      type: "media_approved",
      mediaId: String(media._id),
      ownerType,
      ownerId: String(media.ownerId),
      orgName,
    },
  });
};

/** Club/district portal: upload approved or rejected. */
export const notifyOrgMembersOnMediaReviewed = async ({
  media,
  sentBy,
  approved,
}) => {
  if (!media?.ownerId) return;

  const memberIds = await getOrgUploaderMemberIds(media.ownerType, media.ownerId);
  if (!memberIds.length) return;

  const orgName = await resolveMediaOrgName(media.ownerType, media.ownerId);
  const title = approved ? "Gallery media approved" : "Gallery media rejected";
  const body = approved
    ? `Super admin approved "${mediaTitle(media)}" for ${orgName}. Skaters can now see it in the gallery.`
    : `Super admin rejected "${mediaTitle(media)}" for ${orgName}. It will not appear in the skater gallery.`;

  const portalLink =
    String(media.ownerType || "").toLowerCase() === "district" ? "/district/media" : "/club/media";

  await notifyMany({
    receiverIds: memberIds,
    title,
    body,
    sentBy,
    link: portalLink,
    data: {
      type: approved ? "media_approved_org" : "media_rejected_org",
      mediaId: String(media._id),
      ownerType: String(media.ownerType || ""),
      ownerId: String(media.ownerId),
      orgName,
    },
  });
};

export const notifyOrgMembersOnMediaDeleteReviewed = async ({
  media,
  sentBy,
  deleted,
}) => {
  if (!media?.ownerId) return;

  const memberIds = await getOrgUploaderMemberIds(media.ownerType, media.ownerId);
  if (!memberIds.length) return;

  const orgName = await resolveMediaOrgName(media.ownerType, media.ownerId);
  const title = deleted ? "Gallery media removed" : "Delete request cancelled";
  const body = deleted
    ? `Super admin removed "${mediaTitle(media)}" from the ${orgName} gallery.`
    : `Super admin cancelled the delete request for "${mediaTitle(media)}". It remains in the gallery.`;

  const portalLink =
    String(media.ownerType || "").toLowerCase() === "district" ? "/district/media" : "/club/media";

  await notifyMany({
    receiverIds: memberIds,
    title,
    body,
    sentBy,
    link: portalLink,
    data: {
      type: deleted ? "media_delete_approved" : "media_delete_rejected",
      mediaId: String(media._id),
      ownerType: String(media.ownerType || ""),
      ownerId: String(media.ownerId),
      orgName,
    },
  });
};

export const notifyOrgMembersOnMediaDeleteRequested = async ({ media, sentBy }) => {
  if (!media?.ownerId) return;

  const memberIds = await getOrgUploaderMemberIds(media.ownerType, media.ownerId);
  if (!memberIds.length) return;

  const orgName = await resolveMediaOrgName(media.ownerType, media.ownerId);
  const portalLink =
    String(media.ownerType || "").toLowerCase() === "district" ? "/district/media" : "/club/media";

  await notifyMany({
    receiverIds: memberIds,
    title: "Delete request submitted",
    body: `Your request to remove "${mediaTitle(media)}" from ${orgName} is pending super admin approval.`,
    sentBy,
    link: portalLink,
    data: {
      type: "media_delete_requested",
      mediaId: String(media._id),
      ownerType: String(media.ownerType || ""),
      ownerId: String(media.ownerId),
      orgName,
    },
  });
};
