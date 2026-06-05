import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { Skater } from "../skater/skater.model.js";
import { Gallery } from "./gallery.model.js";
import {
  approvedPublicMediaFilter,
  initialMediaApprovalStatus,
  MEDIA_ADMIN_APPROVAL,
  MEDIA_DELETE_APPROVAL,
  requiresMediaApproval,
} from "./galleryApprovalPolicy.js";

const withMediaType = (item) => ({
  ...item,
  type: item?.videoUrl ? "video" : "img",
  adminApprovalStatus: item?.adminApprovalStatus || MEDIA_ADMIN_APPROVAL.APPROVED,
  deleteApprovalStatus: item?.deleteApprovalStatus || null,
});

const normalizeSingleUrl = (value) => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
};

export const displayAllMediaBasedOnSkaterRepositories = async (skaterId, type, page, limit) => {
  const skater = await Skater.findById(skaterId).select("club").lean();
  if (!skater) {
    throw new AppError("Skater not found", 404);
  }

  const club = skater.club
    ? await Club.findById(skater.club).select("district").lean()
    : null;

  const filters = [{ ownerType: "state" }, { ownerType: "admin" }];

  if (skater.club) {
    filters.push({ ownerType: "club", ownerId: skater.club });
  }

  if (club?.district) {
    filters.push({ ownerType: "district", ownerId: club.district });
  }

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const query = {
    $and: [{ $or: filters }, approvedPublicMediaFilter()],
  };

  if (type === "video") {
    query.videoUrl = { $nin: [null, ""] };
  } else if (type === "img" || type === "image") {
    query.videoUrl = { $in: [null, ""] };
  }

  const [total, data] = await Promise.all([
    Gallery.countDocuments(query),
    Gallery.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
  ]);

  return {
    data: data.map(withMediaType),
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: calcTotalPages(total, perPage),
    },
  };
};

export const displayAllMediaRepositories = async (type = {}, page, limit) => {
  const filter = {};

  const requestedOwnerType = type?.ownerType || type?.type;

  if (
    requestedOwnerType === "both" ||
    requestedOwnerType === "admin" ||
    requestedOwnerType === "state"
  ) {
    filter.ownerType = { $in: ["state", "admin"] };
  } else if (requestedOwnerType && requestedOwnerType !== "all") {
    filter.ownerType = requestedOwnerType;
  }

  if (type?.ownerId) {
    filter.ownerId = type.ownerId;
  }

  if (type?.mediaType === "image") {
    filter.imageUrl = { $ne: null };
  } else if (type?.mediaType === "video") {
    filter.videoUrl = { $ne: null };
  }

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [total, media] = await Promise.all([
    Gallery.countDocuments(filter),
    Gallery.find(filter)
      .populate("ownerId", "fullName name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
  ]);

  const data = media.map((item) =>
    withMediaType({
      ...item,
      ownerId: item?.ownerId
        ? {
          _id: item.ownerId?._id || "",
          fullName: item.ownerId?.fullName || "",
          name: item.ownerId?.name || "",
          role: item.ownerId?.role || "",
        }
        : {
          _id: "",
          fullName: "",
          name: "",
          role: "",
        },
      ownerName: item?.ownerId?.name || item?.ownerId?.fullName || "",
    })
  );

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: calcTotalPages(total, perPage),
    },
  };
};

export const displayPendingMediaForAdminRepositories = async (page, limit) => {
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const query = {
    ownerType: { $in: ["club", "district", "state"] },
    $or: [
      { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.PENDING },
      { deleteApprovalStatus: MEDIA_DELETE_APPROVAL.PENDING },
    ],
  };

  const [total, media] = await Promise.all([
    Gallery.countDocuments(query),
    Gallery.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
  ]);

  const clubIds = media.filter((m) => m.ownerType === "club").map((m) => m.ownerId);
  const districtIds = media.filter((m) => m.ownerType === "district").map((m) => m.ownerId);

  const [clubs, districts] = await Promise.all([
    clubIds.length
      ? Club.find({ _id: { $in: clubIds } })
          .select("_id name")
          .lean()
      : [],
    districtIds.length
      ? District.find({ _id: { $in: districtIds } })
          .select("_id name")
          .lean()
      : [],
  ]);

  const clubNameById = new Map(clubs.map((c) => [String(c._id), c.name || ""]));
  const districtNameById = new Map(districts.map((d) => [String(d._id), d.name || ""]));

  const data = media.map((item) => {
    const ownerKey = String(item.ownerId);
    const orgName =
      item.ownerType === "club"
        ? clubNameById.get(ownerKey) || ""
        : districtNameById.get(ownerKey) || "";

    return withMediaType({
      ...item,
      orgName,
      pendingAction:
        item.deleteApprovalStatus === MEDIA_DELETE_APPROVAL.PENDING
          ? "delete"
          : "approval",
    });
  });

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: calcTotalPages(total, perPage),
    },
  };
};

export const basedOnRoleDisplayRepositories = async ({ ownerType, ownerId, type }, page, limit) => {
  const filter = { ownerType, ownerId };

  if (type === "video") {
    filter.videoUrl = { $ne: null };
  } else if (type === "img" || type === "image") {
    filter.videoUrl = null;
  }

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [total, media] = await Promise.all([
    Gallery.countDocuments(filter),
    Gallery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
  ]);

  return {
    data: media.map(withMediaType),
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: calcTotalPages(total, perPage),
    },
  };
};
export const addMediaREpositories = async (data) => {
  const ownerType = data.ownerType;
  return Gallery.create({
    imageUrl: normalizeSingleUrl(data?.imageUrl ?? data?.img),
    videoUrl: normalizeSingleUrl(data?.videoUrl ?? data?.video),
    title: data?.title || "",
    about: data?.about || "",
    ownerType,
    ownerId: data.ownerId,
    adminApprovalStatus: initialMediaApprovalStatus(ownerType, data.uploaderRole),
    deleteApprovalStatus: null,
  });
};

export const updateMediaRepositories = async (id, payload, accessFilter = {}) => {
  return Gallery.findOneAndUpdate(
    { _id: id, ...accessFilter },
    payload,
    { new: true, runValidators: true }
  ).lean();
};

export const deleteMediaRepositories = async (id, accessFilter = {}) => {
  return Gallery.findOneAndDelete({ _id: id, ...accessFilter }).lean();
};

export const requestMediaDeleteRepositories = async (id, accessFilter = {}) => {
  return Gallery.findOneAndUpdate(
    { _id: id, ...accessFilter },
    { $set: { deleteApprovalStatus: MEDIA_DELETE_APPROVAL.PENDING } },
    { new: true }
  ).lean();
};

export const approveMediaByAdminRepositories = async (id) => {
  const item = await Gallery.findById(id).lean();
  if (!item) {
    throw new AppError("Media not found", 404);
  }
  if (!requiresMediaApproval(item.ownerType)) {
    throw new AppError("This media does not require approval", 400);
  }
  return Gallery.findByIdAndUpdate(
    id,
    { $set: { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.APPROVED } },
    { new: true }
  ).lean();
};

export const rejectMediaByAdminRepositories = async (id) => {
  const item = await Gallery.findById(id).lean();
  if (!item) {
    throw new AppError("Media not found", 404);
  }
  if (!requiresMediaApproval(item.ownerType)) {
    throw new AppError("This media does not require approval", 400);
  }
  return Gallery.findByIdAndUpdate(
    id,
    { $set: { adminApprovalStatus: MEDIA_ADMIN_APPROVAL.REJECTED } },
    { new: true }
  ).lean();
};

export const approveMediaDeleteByAdminRepositories = async (id) => {
  const item = await Gallery.findById(id).lean();
  if (!item) {
    throw new AppError("Media not found", 404);
  }
  if (item.deleteApprovalStatus !== MEDIA_DELETE_APPROVAL.PENDING) {
    throw new AppError("No pending delete request for this media", 400);
  }
  await Gallery.findByIdAndDelete(id);
  return { deleted: true, _id: id };
};

export const rejectMediaDeleteByAdminRepositories = async (id) => {
  const item = await Gallery.findById(id).lean();
  if (!item) {
    throw new AppError("Media not found", 404);
  }
  if (item.deleteApprovalStatus !== MEDIA_DELETE_APPROVAL.PENDING) {
    throw new AppError("No pending delete request for this media", 400);
  }
  return Gallery.findByIdAndUpdate(
    id,
    { $unset: { deleteApprovalStatus: "" } },
    { new: true }
  ).lean();
};

/** Club JWT may be the club doc _id or a member listed on Club.members. */
export const resolveClubOwnerIdRepositories = async (user) => {
  const userId = user?._id ?? user;
  if (!userId) {
    throw new AppError("Club not found for this token", 404);
  }

  const clubByMember = await Club.findOne({
    members: new mongoose.Types.ObjectId(userId),
  })
    .select("_id")
    .lean();

  if (clubByMember?._id) {
    return clubByMember._id;
  }

  const clubById = await Club.findById(userId).select("_id").lean();
  if (clubById?._id) {
    return clubById._id;
  }

  throw new AppError("Club not found for this token", 404);
};

/** District media is owned by the District document (_id on user.district), not the auth user _id. */
export const resolveDistrictOwnerIdRepositories = async (user) => {
  const userId = user?._id ?? user;
  if (!userId) {
    throw new AppError("District not found for this token", 404);
  }

  let districtRef = user?.district;
  if (!districtRef) {
    const districtUser = await BaseAuth.findById(userId).select("district").lean();
    districtRef = districtUser?.district;
  }

  if (districtRef) {
    return districtRef;
  }

  const district = await District.findOne({ members: userId }).select("_id").lean();
  if (!district) {
    throw new AppError("District not found for this token", 404);
  }

  return district._id;
};