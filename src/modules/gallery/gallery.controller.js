import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { addMediaService, displayAllMediaBasedOnSkaterService, displayAllMediaServices } from "./gallery.services.js";

export const displayAllMediaBasedOnSkater = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const media = await displayAllMediaBasedOnSkaterService(id);
    return res.status(200).json(new ApiResponse(200, media, "Display all media successfully"));
 });

export const displayAllMedia = asyncHandler(async (req, res) => {
  const { ownerType, ownerId, mediaType, type } = req.query;

  const media = await displayAllMediaServices({
    ownerType: ownerType || type,
    ownerId,
    mediaType
  });

  return res
    .status(200)
    .json(new ApiResponse(200, media, "Display media"));
});

export const addMedia = asyncHandler(async (req, res) => {
    await addMediaService(req.body, req.user);
    return res.status(200).json(new ApiResponse(200, null, "Media added successfully"));
});

