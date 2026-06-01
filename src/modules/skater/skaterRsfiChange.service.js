import { AppError } from "../../util/common/AppError.js";
import {
  notifyClubMembersOnSkaterRsfiChangeApply,
  notifySkaterOnRsfiChangeApproved,
  notifySkaterOnRsfiChangeRejected,
} from "../../util/firebase/sendNotification.js";
import {
  approveRsfiChangeRepository,
  rejectRsfiChangeRepository,
  upsertPendingRsfiChangeRepository,
} from "./skaterRsfiChange.repositories.js";

const normalizeRsfiPayload = (body = {}) => {
  const value = body.rsfiId ?? body.rfsiId;
  return String(value ?? "").trim();
};

export const requestSkaterRsfiChangeService = async (skaterUser, body) => {
  const requestedRsfiId = normalizeRsfiPayload(body);
  if (!requestedRsfiId) {
    throw new AppError("RSFI ID is required", 400);
  }

  const skaterId = skaterUser?._id || skaterUser?.id;
  if (!skaterId) {
    throw new AppError("User not authenticated", 401);
  }

  const { request, skater, clubId } = await upsertPendingRsfiChangeRepository(
    skaterId,
    requestedRsfiId
  );

  await notifyClubMembersOnSkaterRsfiChangeApply({
    clubDocId: clubId,
    skaterId,
    skaterName: skater.fullName || "",
    currentRsfiId: request.currentRsfiId || skater.rsfiId || "",
    requestedRsfiId: request.requestedRsfiId,
  });

  return {
    requestId: request._id,
    currentRsfiId: request.currentRsfiId || skater.rsfiId || "",
    requestedRsfiId: request.requestedRsfiId,
    status: "pending",
    message:
      "RSFI ID change submitted for club approval. Your profile will update after the club approves.",
  };
};

export const approveSkaterRsfiChangeService = async (skaterId, clubMemberId) => {
  const { skater, club, request } = await approveRsfiChangeRepository(
    skaterId,
    clubMemberId
  );

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
    requestedRsfiId: request.requestedRsfiId,
  };
};

export const rejectSkaterRsfiChangeService = async (skaterId, clubMemberId) => {
  const { skater, club, request } = await rejectRsfiChangeRepository(
    skaterId,
    clubMemberId
  );

  await notifySkaterOnRsfiChangeRejected({
    skaterId,
    sentBy: clubMemberId,
    clubDocId: club._id,
    clubName: club.name,
  });

  return { skaterId, status: "rejected" };
};
