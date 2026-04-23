import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  addMediaService,
  deleteMediaService,
  displayAllMediaBasedOnSkaterService,
  displayAllMediaServices,
  updateMediaService,
} from "./gallery.services.js";

export const displayAllMediaBasedOnSkater = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const media = await displayAllMediaBasedOnSkaterService(id, page, limit);
    return res.status(200).json(new ApiResponse(200, media, "Display all media successfully"));
 });

export const displayAllMedia = asyncHandler(async (req, res) => {
  const { ownerType, ownerId, mediaType, type, page = 1, limit = 10 } = req.query;

  const media = await displayAllMediaServices({
    ownerType: ownerType || type,
    ownerId,
    mediaType
  }, page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, media, "Display media"));
});

export const addMedia = asyncHandler(async (req, res) => {
    await addMediaService(req.body, req.user);
    return res.status(200).json(new ApiResponse(200, null, "Media added successfully"));
});

export const updateMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const media = await updateMediaService(id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, media, "Media updated successfully"));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteMediaService(id, req.user);
  return res.status(200).json(new ApiResponse(200, null, "Media deleted successfully"));
});

