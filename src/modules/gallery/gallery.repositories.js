import { AppError } from "../../util/common/AppError.js";
import { Club } from "../club/club.model.js";
import { Skater } from "../skater/skater.model.js";
import { Gallery } from "./gallery.model.js";

export const displayAllMediaBasedOnSkaterRepositories = async (skaterId) => {
  const skater = await Skater.findById(skaterId).select("club").lean();
  if (!skater) {
    throw new AppError("Skater not found", 404);
  }

  const club = skater.club
    ? await Club.findById(skater.club).select("district").lean()
    : null;

  const filters = [{ ownerType: "state" },{ ownerType: "admin" }];

  if (skater.club) {
    filters.push({ ownerType: "club", ownerId: skater.club });
  }

  if (club?.district) {
    filters.push({ ownerType: "district", ownerId: club.district });
  }

  return Gallery.find({ $or: filters }).sort({ createdAt: -1 }).lean();
};

export const displayAllMediaRepositories = async (type = {}) => {
  const filter = {};

  const requestedOwnerType = type?.ownerType || type?.type;

  if (requestedOwnerType === "both") {
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

  const media = await Gallery.find(filter)
    .populate("ownerId", "fullName name  role")
    .sort({ createdAt: -1 })
    .lean();

  return media.map((item) => ({
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
  }));
};
export const addMediaREpositories = async (data) => {
  return Gallery.create({
    imageUrl: data?.img || data?.imageUrl || null,
    videoUrl: data?.videoUrl || null,
    ownerType: data.ownerType,
    ownerId: data.ownerId,
  });
};