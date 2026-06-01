import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { Skater } from "./skater.model.js";
import { SkaterRsfiChangeRequest } from "./skaterRsfiChangeRequest.model.js";
import { resolveClubIdFromClubMember } from "../club/club.repositories.js";

const trimRsfi = (value) => String(value ?? "").trim();

export const upsertPendingRsfiChangeRepository = async (
  skaterId,
  requestedRsfiId
) => {
  const skater = await Skater.findById(skaterId)
    .select("fullName rsfiId club clubStatus role")
    .lean();

  if (!skater || String(skater.role || "").toLowerCase() !== "skater") {
    throw new AppError("Skater not found", 404);
  }

  if (!skater.club || skater.clubStatus !== "join") {
    throw new AppError(
      "You must be a joined member of a club before requesting an RSFI ID change",
      400
    );
  }

  const clubId = skater.club?._id ?? skater.club;
  const currentRsfiId = trimRsfi(skater.rsfiId);
  const nextRsfiId = trimRsfi(requestedRsfiId);

  if (!nextRsfiId) {
    throw new AppError("RSFI ID is required", 400);
  }

  if (nextRsfiId === currentRsfiId) {
    throw new AppError("New RSFI ID must be different from your current RSFI ID", 400);
  }

  let request = await SkaterRsfiChangeRequest.findOneAndUpdate(
    { skater: skaterId, club: clubId, status: "pending" },
    {
      $set: {
        currentRsfiId,
        requestedRsfiId: nextRsfiId,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  if (!request) {
    request = await SkaterRsfiChangeRequest.create({
      skater: skaterId,
      club: clubId,
      currentRsfiId,
      requestedRsfiId: nextRsfiId,
      status: "pending",
    }).then((doc) => doc.toObject());
  }

  return {
    request,
    skater,
    clubId,
  };
};

export const listPendingRsfiChangesForClubRepository = async (clubDocId) => {
  if (!clubDocId) {
    return [];
  }

  const clubOid =
    clubDocId instanceof mongoose.Types.ObjectId
      ? clubDocId
      : new mongoose.Types.ObjectId(String(clubDocId));

  const rows = await SkaterRsfiChangeRequest.find({
    club: clubOid,
    status: "pending",
  })
    .populate({ path: "skater", select: "fullName krsaId rsfiId" })
    .sort({ updatedAt: -1 })
    .lean();

  return rows.map((row) => ({
    _id: row._id,
    skaterId: row.skater?._id ?? row.skater,
    fullName: row.skater?.fullName || "",
    krsaId: row.skater?.krsaId || "",
    currentRsfiId: row.currentRsfiId || "",
    requestedRsfiId: row.requestedRsfiId || "",
    sortAt: row.updatedAt || row.createdAt,
  }));
};

const resolvePendingRequestForClub = async (skaterId, clubMemberId) => {
  const club = await resolveClubIdFromClubMember(clubMemberId);
  const request = await SkaterRsfiChangeRequest.findOne({
    skater: skaterId,
    club: club._id,
    status: "pending",
  }).lean();

  if (!request) {
    throw new AppError("No pending RSFI ID change request found for this skater", 404);
  }

  return { club, request };
};

export const approveRsfiChangeRepository = async (skaterId, clubMemberId) => {
  const { club, request } = await resolvePendingRequestForClub(skaterId, clubMemberId);

  const updatedSkater = await Skater.findOneAndUpdate(
    { _id: skaterId, club: club._id, clubStatus: "join" },
    { $set: { rsfiId: request.requestedRsfiId } },
    { new: true }
  )
    .select("fullName rsfiId krsaId club")
    .lean();

  if (!updatedSkater) {
    throw new AppError("Skater is not an active member of your club", 400);
  }

  await SkaterRsfiChangeRequest.updateOne(
    { _id: request._id },
    {
      $set: {
        status: "approved",
        reviewedBy: clubMemberId,
        reviewedAt: new Date(),
      },
    }
  );

  return { skater: updatedSkater, club, request };
};

export const rejectRsfiChangeRepository = async (skaterId, clubMemberId) => {
  const { club, request } = await resolvePendingRequestForClub(skaterId, clubMemberId);

  await SkaterRsfiChangeRequest.updateOne(
    { _id: request._id },
    {
      $set: {
        status: "rejected",
        reviewedBy: clubMemberId,
        reviewedAt: new Date(),
      },
    }
  );

  const skater = await Skater.findById(skaterId).select("fullName rsfiId").lean();

  return { skater, club, request };
};
