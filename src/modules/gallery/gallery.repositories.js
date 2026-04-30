import { AppError } from "../../util/common/AppError.js";
import { paginate } from "../../util/common/paginate.js";
import { Club } from "../club/club.model.js";
import { Skater } from "../skater/skater.model.js";
import { Gallery } from "./gallery.model.js";

const withMediaType = (item) => ({
  ...item,
  type: item?.videoUrl ? "video" : "img",
});

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
  const query = { $or: filters };

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
      totalPages: Math.ceil(total / perPage),
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
  } else if (requestedOwnerType) {
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

  const data = media.map((item) => ({
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
    type: item?.videoUrl ? "video" : "img",
  }));

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
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
      totalPages: Math.ceil(total / perPage),
    },
  };
};
export const addMediaREpositories = async (data) => {
  return Gallery.create({
    imageUrl: data?.img || data?.imageUrl || null,
    videoUrl: data?.videoUrl || null,
    title: data?.title || "",
    about: data?.about || "",
    ownerType: data.ownerType,
    ownerId: data.ownerId,
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