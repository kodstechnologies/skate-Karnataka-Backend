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

let rsfiRequestIndexesEnsured = false;
const ensureRsfiRequestIndexes = async () => {
  if (rsfiRequestIndexesEnsured) return;

  const indexes = await SkaterRsfiChangeRequest.collection.indexes();
  for (const idx of indexes) {
    const key = idx.key || {};
    const isLegacyUnique =
      idx.name === "skater_1_club_1" ||
      (idx.unique &&
        key.skater === 1 &&
        key.club === 1 &&
        key.requestType == null);
    if (isLegacyUnique) {
      await SkaterRsfiChangeRequest.collection.dropIndex(idx.name);
    }
  }

  await SkaterRsfiChangeRequest.syncIndexes();

  const legacyPending = await SkaterRsfiChangeRequest.find({
    status: "pending",
    $or: [{ requestType: { $exists: false } }, { requestType: null }, { requestType: "" }],
  })
    .select("_id currentRsfiId requestedRsfiId currentPhoto requestedPhoto")
    .lean();

  for (const row of legacyPending) {
    const hasPhotoChange =
      String(row.requestedPhoto || "").trim() &&
      String(row.requestedPhoto || "").trim() !== String(row.currentPhoto || "").trim();
    const hasRsfiChange =
      String(row.requestedRsfiId || "").trim() &&
      String(row.requestedRsfiId || "").trim() !== String(row.currentRsfiId || "").trim();
    const requestType = hasPhotoChange && !hasRsfiChange ? "photo" : "rsfi";
    await SkaterRsfiChangeRequest.updateOne(
      { _id: row._id },
      { $set: { requestType } }
    );
  }

  rsfiRequestIndexesEnsured = true;
};

const buildTypedRequestFields = ({
  requestType,
  requestedRsfi = "",
  requestedPhotoUrl = "",
  currentRsfiId = "",
  currentPhoto = "",
}) => {
  if (requestType === "photo") {
    return {
      requestType,
      currentRsfiId: "",
      requestedRsfiId: "",
      currentPhoto,
      requestedPhoto: requestedPhotoUrl || "",
    };
  }

  return {
    requestType: "rsfi",
    currentRsfiId: currentRsfiId || "",
    requestedRsfiId: requestedRsfi || "",
    currentPhoto: "",
    requestedPhoto: "",
  };
};

export const applyDirectSkaterProfileChangeRepository = async (
  skaterId,
  { rsfiId = "", photo = "" } = {}
) => {
  const skater = await Skater.findById(skaterId)
    .select("fullName rsfiId photo club clubStatus role")
    .lean();

  if (!skater || String(skater.role || "").toLowerCase() !== "skater") {
    throw new AppError("Skater not found", 404);
  }

  const nextRsfiId = trimRsfi(rsfiId);
  const nextPhoto = String(photo || "").trim();
  const currentRsfiId = trimRsfi(skater.rsfiId);
  const currentPhoto = String(skater.photo || "").trim();

  const updateSet = {};
  if (nextRsfiId && nextRsfiId !== currentRsfiId) {
    updateSet.rsfiId = nextRsfiId;
  }
  if (nextPhoto && nextPhoto !== currentPhoto) {
    updateSet.photo = nextPhoto;
  }

  if (Object.keys(updateSet).length === 0) {
    throw new AppError("No changes detected for RSFI ID or photo", 400);
  }

  const updated = await Skater.findByIdAndUpdate(
    skaterId,
    { $set: updateSet },
    { new: true, runValidators: true }
  )
    .select("fullName rsfiId photo")
    .lean();

  return updated;
};

export const upsertPendingRsfiChangeRepository = async (
  skaterId,
  requestedRsfiId,
  requestedPhoto = ""
) => {
  await ensureRsfiRequestIndexes();

  const skater = await Skater.findById(skaterId)
    .select("fullName rsfiId photo club clubStatus role")
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
  const currentPhoto = String(skater.photo || "").trim();
  const nextPhoto = String(requestedPhoto || "").trim();

  const hasRsfiInput = Boolean(nextRsfiId);
  const hasPhotoInput = Boolean(nextPhoto);
  const wantsBoth = hasRsfiInput && hasPhotoInput;

  const wantsRsfi = wantsBoth
    ? hasRsfiInput
    : hasRsfiInput && nextRsfiId !== currentRsfiId;
  const wantsPhoto = wantsBoth
    ? hasPhotoInput
    : hasPhotoInput && nextPhoto !== currentPhoto;

  if (!wantsRsfi && !wantsPhoto) {
    throw new AppError("No changes detected for RSFI ID or photo", 400);
  }

  const upsertTypedPendingRequest = async ({
    requestType,
    requestedRsfi = "",
    requestedPhotoUrl = "",
  }) => {
    const typedFields = buildTypedRequestFields({
      requestType,
      requestedRsfi,
      requestedPhotoUrl,
      currentRsfiId,
      currentPhoto,
    });

    let request = await SkaterRsfiChangeRequest.findOneAndUpdate(
      { skater: skaterId, club: clubId, requestType, status: "pending" },
      { $set: typedFields },
      { new: true, runValidators: true }
    ).lean();

    if (!request) {
      request = await SkaterRsfiChangeRequest.create({
        skater: skaterId,
        club: clubId,
        ...typedFields,
        status: "pending",
      }).then((doc) => doc.toObject());
    }

    return request;
  };

  const requests = [];
  if (wantsRsfi) {
    requests.push(
      await upsertTypedPendingRequest({
        requestType: "rsfi",
        requestedRsfi: nextRsfiId,
        requestedPhotoUrl: "",
      })
    );
  }
  if (wantsPhoto) {
    requests.push(
      await upsertTypedPendingRequest({
        requestType: "photo",
        requestedRsfi: "",
        requestedPhotoUrl: nextPhoto,
      })
    );
  }

  return {
    requests,
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
    requestType: { $in: ["rsfi", "photo"] },
    $or: orClause,
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
      currentPhoto: row.currentPhoto || "",
      requestedPhoto: row.requestedPhoto || "",
      requestType: row.requestType || "rsfi",
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

  let request = await findPendingForClub({ _id: objectId });

  if (!request) {
    const pendingForSkater = await SkaterRsfiChangeRequest.find({
      status: "pending",
      club: clubOid,
      skater: objectId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (pendingForSkater.length > 1) {
      throw new AppError(
        "Multiple pending profile change requests found. Approve using requestId.",
        400
      );
    }

    request = pendingForSkater[0] || null;
  }

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

  const updateSet = {};
  if (request.requestType === "rsfi" && request.requestedRsfiId) {
    updateSet.rsfiId = request.requestedRsfiId;
  }
  if (request.requestType === "photo" && request.requestedPhoto) {
    updateSet.photo = request.requestedPhoto;
  }
  // Backward compatibility for old rows without requestType.
  if (!request.requestType) {
    if (request.requestedRsfiId) updateSet.rsfiId = request.requestedRsfiId;
    if (request.requestedPhoto) updateSet.photo = request.requestedPhoto;
  }

  const updatedSkater = await Skater.findOneAndUpdate(
    { _id: skaterId, club: club._id, clubStatus: "join" },
    { $set: updateSet },
    { new: true }
  )
    .select("fullName rsfiId krsaId club photo")
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
