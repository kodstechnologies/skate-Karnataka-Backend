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

  const filters = [{ ownerType: "state" }];

  if (skater.club) {
    filters.push({ ownerType: "club", ownerId: skater.club });
  }

  if (club?.district) {
    filters.push({ ownerType: "district", ownerId: club.district });
  }

  return Gallery.find({ $or: filters }).sort({ createdAt: -1 }).lean();
};

export const addMediaREpositories = async (data) => {
  return Gallery.create({
    imageUrl: data?.img || data?.imageUrl || null,
    videoUrl: data?.videoUrl || null,
    ownerType: data.ownerType,
    ownerId: data.ownerId,
  });
};