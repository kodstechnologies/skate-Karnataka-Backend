import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { Skater } from "./skater.model.js";
import { SkaterRsfiChangeRequest } from "./skaterRsfiChangeRequest.model.js";
import {
  resolveClubDocumentByRef,
  resolveClubIdFromClubMember,
} from "../club/club.repositories.js";

const trimRsfi = (value) => String(value ?? "").trim();

const sameObjectId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

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

  const clubDoc = await resolveClubDocumentByRef(skater.club);
  if (!clubDoc?._id) {
    throw new AppError("Club not found for this skater", 400);
  }

  const clubId = clubDoc._id;
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
    const existingNonPending = await SkaterRsfiChangeRequest.findOne({
      skater: skaterId,
      club: clubId,
      status: { $ne: "pending" },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (existingNonPending) {
      request = await SkaterRsfiChangeRequest.findOneAndUpdate(
        { _id: existingNonPending._id },
        {
          $set: {
            currentRsfiId,
            requestedRsfiId: nextRsfiId,
            status: "pending",
            reviewedBy: null,
            reviewedAt: null,
          },
        },
        { new: true, runValidators: true }
      ).lean();
    } else {
      request = await SkaterRsfiChangeRequest.create({
        skater: skaterId,
        club: clubId,
        currentRsfiId,
        requestedRsfiId: nextRsfiId,
        status: "pending",
      }).then((doc) => doc.toObject());
    }
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

  const joinedSkaterIds = await Skater.find({
    club: clubOid,
    clubStatus: "join",
    role: "Skater",
  })
    .select("_id")
    .lean();

  const skaterObjectIds = joinedSkaterIds.map((row) => row._id);

  const orClause = [{ club: clubOid }];
  if (skaterObjectIds.length) {
    orClause.push({ skater: { $in: skaterObjectIds } });
  }

  const rows = await SkaterRsfiChangeRequest.find({
    status: "pending",
    $or: orClause,
  })
    .populate({ path: "skater", select: "fullName krsaId rsfiId" })
    .sort({ updatedAt: -1 })
    .lean();

  const seenSkaters = new Set();

  return rows
    .filter((row) => {
      const skaterKey = String(row.skater?._id ?? row.skater ?? "");
      if (!skaterKey || seenSkaters.has(skaterKey)) {
        return false;
      }
      seenSkaters.add(skaterKey);
      return true;
    })
    .map((row) => ({
      _id: row._id,
      skaterId: row.skater?._id ?? row.skater,
      fullName: row.skater?.fullName || "",
      krsaId: row.skater?.krsaId || "",
      currentRsfiId: row.currentRsfiId || "",
      requestedRsfiId: row.requestedRsfiId || "",
      sortAt: row.updatedAt || row.createdAt,
    }));
};

const resolvePendingRequestForClub = async (skaterOrRequestId, clubMemberId) => {
  const memberClub = await resolveClubIdFromClubMember(clubMemberId);
  const clubOid = memberClub._id;
  const rawId = String(skaterOrRequestId || "").trim();

  if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AppError("Invalid skater or request id", 400);
  }

  const objectId = new mongoose.Types.ObjectId(rawId);

  const findPendingForClub = (extra = {}) =>
    SkaterRsfiChangeRequest.findOne({
      status: "pending",
      club: clubOid,
      ...extra,
    }).lean();

  let request =
    (await findPendingForClub({ skater: objectId })) ||
    (await findPendingForClub({ _id: objectId }));

  if (!request) {
    const loose =
      (await SkaterRsfiChangeRequest.findOne({ _id: objectId, status: "pending" }).lean()) ||
      (await SkaterRsfiChangeRequest.findOne({ skater: objectId, status: "pending" }).lean());

    if (loose) {
      const requestClub = await resolveClubDocumentByRef(loose.club);
      if (requestClub && sameObjectId(requestClub._id, clubOid)) {
        request = loose;
      }
    }
  }

  if (!request) {
    const latest = await SkaterRsfiChangeRequest.findOne({
      $or: [{ _id: objectId }, { skater: objectId }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (latest && latest.status !== "pending") {
      throw new AppError(
        `RSFI ID change request was already ${latest.status}`,
        400
      );
    }

    throw new AppError("No pending RSFI ID change request found for this skater", 404);
  }

  return { club: memberClub, request };
};

export const approveRsfiChangeRepository = async (skaterOrRequestId, clubMemberId) => {
  const { club, request } = await resolvePendingRequestForClub(
    skaterOrRequestId,
    clubMemberId
  );

  const skaterId = request.skater?._id ?? request.skater;

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

export const rejectRsfiChangeRepository = async (skaterOrRequestId, clubMemberId) => {
  const { club, request } = await resolvePendingRequestForClub(
    skaterOrRequestId,
    clubMemberId
  );

  const skaterId = request.skater?._id ?? request.skater;

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
