import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  addMediaService,
  approveMediaByAdminService,
  approveMediaDeleteByAdminService,
  basedOnRoleDisplayService,
  deleteMediaService,
  displayAllMediaBasedOnSkaterService,
  displayAllMediaServices,
  displayPendingMediaForAdminService,
  rejectMediaByAdminService,
  rejectMediaDeleteByAdminService,
  updateMediaService,
} from "./gallery.services.js";

export const displayAllMediaBasedOnSkater = asyncHandler(async (req, res) => {
  const id = req.user._id;
  const { page = 1, limit = 10, type = "all" } = req.query;
  const media = await displayAllMediaBasedOnSkaterService(id, type, page, limit);
  return res.status(200).json(new ApiResponse(200, media, "Display all media successfully"));
});

export const displayAllMedia = asyncHandler(async (req, res) => {
  const { ownerType, ownerId, mediaType, type, page = 1, limit = 10 } = req.query;

  const media = await displayAllMediaServices(
    {
      ownerType: ownerType || type,
      ownerId,
      mediaType,
    },
    page,
    limit
  );

  return res.status(200).json(new ApiResponse(200, media, "Display media"));
});

export const displayPendingMediaForAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const media = await displayPendingMediaForAdminService(page, limit);
  return res.status(200).json(new ApiResponse(200, media, "Pending gallery media"));
});

export const basedOnRoleDisplay = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type } = req.query;
  const media = await basedOnRoleDisplayService(req.user, type, page, limit);

  return res.status(200).json(new ApiResponse(200, media, "Display media"));
});

export const addMedia = asyncHandler(async (req, res) => {
  const result = await addMediaService(req.body, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result?.media ?? null, result?.message || "Media added successfully"));
});

export const updateMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const media = await updateMediaService(id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, media, "Media updated successfully"));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteMediaService(id, req.user);
  return res.status(200).json(
    new ApiResponse(200, result, result?.message || "Media deleted successfully")
  );
});

export const approveMediaByAdmin = asyncHandler(async (req, res) => {
  const result = await approveMediaByAdminService(req.params.id, req.user?._id, req.user?.role);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Media approved — visible to skaters"));
});

export const rejectMediaByAdmin = asyncHandler(async (req, res) => {
  const result = await rejectMediaByAdminService(req.params.id, req.user?._id, req.user?.role);
  return res.status(200).json(new ApiResponse(200, result, "Media rejected"));
});

export const approveMediaDeleteByAdmin = asyncHandler(async (req, res) => {
  const result = await approveMediaDeleteByAdminService(req.params.id, req.user?._id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Media delete approved"));
});

export const rejectMediaDeleteByAdmin = asyncHandler(async (req, res) => {
  const result = await rejectMediaDeleteByAdminService(req.params.id, req.user?._id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Media delete request cancelled"));
});
