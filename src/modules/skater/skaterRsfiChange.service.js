import { AppError } from "../../util/common/AppError.js";
import {
  notifyClubMembersOnSkaterRsfiChangeApply,
  notifySkaterOnRsfiChangeApproved,
  notifySkaterOnRsfiChangeRejected,
} from "../../util/firebase/sendNotification.js";
import {
  approveRsfiChangeRepository,
  applyDirectSkaterProfileChangeRepository,
  rejectRsfiChangeRepository,
  upsertPendingRsfiChangeRepository,
} from "./skaterRsfiChange.repositories.js";
import { Skater } from "./skater.model.js";

const normalizeRsfiPayload = (body = {}) => {
  const value = body.rsfiId ?? body.rfsiId ?? body.rsfid;
  return String(value ?? "").trim();
};

const normalizePhotoPayload = (body = {}) =>
  String(body.photo ?? body.img ?? "").trim();

const hasJoinedClub = (skater) =>
  Boolean(skater?.club) && skater.clubStatus === "join";

export const requestSkaterRsfiChangeService = async (skaterUser, body) => {
  const requestedRsfiId = normalizeRsfiPayload(body);
  const requestedPhoto = normalizePhotoPayload(body);
  if (!requestedRsfiId && !requestedPhoto) {
    throw new AppError("At least one field is required: rsfiId or photo", 400);
  }

  const skaterId = skaterUser?._id || skaterUser?.id;
  if (!skaterId) {
    throw new AppError("User not authenticated", 401);
  }

  const skater = await Skater.findById(skaterId)
    .select("fullName rsfiId photo club clubStatus role")
    .lean();

  if (!skater || String(skater.role || "").toLowerCase() !== "skater") {
    throw new AppError("Skater not found", 404);
  }

  if (!hasJoinedClub(skater)) {
    const updated = await applyDirectSkaterProfileChangeRepository(skaterId, {
      rsfiId: requestedRsfiId,
      photo: requestedPhoto,
    });

    return {
      requestIds: [],
      requests: [],
      status: "approved",
      appliedDirectly: true,
      rsfiId: updated.rsfiId || "",
      photo: updated.photo || "",
      message: "Profile updated successfully.",
    };
  }

  const { requests, skater: joinedSkater, clubId } = await upsertPendingRsfiChangeRepository(
    skaterId,
    requestedRsfiId,
    requestedPhoto
  );

  await notifyClubMembersOnSkaterRsfiChangeApply({
    clubDocId: clubId,
    skaterId,
    skaterName: joinedSkater.fullName || "",
    currentRsfiId: joinedSkater.rsfiId || "",
    requestedRsfiId: requestedRsfiId || "",
  });

  const formattedRequests = (requests || []).map((request) => ({
    requestId: String(request._id),
    requestType: request.requestType || (request.requestedPhoto ? "photo" : "rsfi"),
    currentRsfiId:
      request.requestType === "photo" ? "" : request.currentRsfiId || joinedSkater.rsfiId || "",
    requestedRsfiId: request.requestType === "photo" ? "" : request.requestedRsfiId || "",
    currentPhoto:
      request.requestType === "rsfi" ? "" : request.currentPhoto || joinedSkater.photo || "",
    requestedPhoto: request.requestType === "rsfi" ? "" : request.requestedPhoto || "",
    status: "pending",
  }));

  const uniqueRequests = formattedRequests.filter(
    (request, index, all) =>
      all.findIndex((item) => item.requestId === request.requestId) === index
  );

  return {
    requestIds: uniqueRequests.map((r) => r.requestId),
    requests: uniqueRequests,
    status: "pending",
    message:
      uniqueRequests.length > 1
        ? "Separate RSFI and photo change requests submitted for club approval."
        : "Change request submitted for club approval.",
  };
};

export const approveSkaterRsfiChangeService = async (skaterOrRequestId, clubMemberId) => {
  const { skater, club, request } = await approveRsfiChangeRepository(
    skaterOrRequestId,
    clubMemberId
  );

  const skaterId = skater._id;

  await notifySkaterOnRsfiChangeApproved({
    skaterId,
    sentBy: clubMemberId,
    clubDocId: club._id,
    clubName: club.name,
    requestedRsfiId: request.requestedRsfiId,
  });

  return {
    skaterId: skater._id,
    rsfiId: skater.rsfiId,
    photo: skater.photo || "",
    requestedRsfiId: request.requestedRsfiId,
    requestedPhoto: request.requestedPhoto || "",
  };
};

export const rejectSkaterRsfiChangeService = async (skaterOrRequestId, clubMemberId) => {
  const { skater, club, request } = await rejectRsfiChangeRepository(
    skaterOrRequestId,
    clubMemberId
  );

  const skaterId = skater?._id ?? request.skater?._id ?? request.skater;

  if (skaterId) {
    await notifySkaterOnRsfiChangeRejected({
      skaterId,
      sentBy: clubMemberId,
      clubDocId: club._id,
      clubName: club.name,
    });
  }

  return {
    skaterId,
    requestId: request._id,
    status: "rejected",
  };
};
