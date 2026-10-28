import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  create_manual_event_service,
  update_manual_event_service,
  get_all_manual_events_service,
  get_manual_event_by_id_service,
  delete_manual_event_service,
  upload_manual_event_attendance_service,
} from "./manual-event.services.js";

/**
 * 1. Create a new manual event
 * POST /manual-events
 */
export const createManualEvent = asyncHandler(async (req, res) => {
  const result = await create_manual_event_service(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, result, "Manual event created successfully"));
});

/**
 * 2. Edit an existing manual event
 * PATCH/PUT /manual-events/:id
 */
export const updateManualEvent = asyncHandler(async (req, res) => {
  const result = await update_manual_event_service(req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Manual event updated successfully"));
});

/**
 * 3. All manual events display (with search, filter, pagination)
 * GET /manual-events
 */
export const getAllManualEvents = asyncHandler(async (req, res) => {
  const result = await get_all_manual_events_service(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Manual events fetched successfully"));
});

/**
 * 4. One manual event full details display
 * GET /manual-events/:id
 */
export const getManualEventById = asyncHandler(async (req, res) => {
  const result = await get_manual_event_by_id_service(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Manual event full details fetched successfully"));
});

/**
 * 5. Delete manual event
 * DELETE /manual-events/:id
 */
export const deleteManualEvent = asyncHandler(async (req, res) => {
  const result = await delete_manual_event_service(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Manual event deleted successfully"));
});

/**
 * 6. District upload / re-upload skater Excel attendance document
 * POST /manual-events/:id/attendance
 */
export const uploadManualEventAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { districtId, districtName, stateName, skaterExcelDocument, fileName } = req.body;
  const user = req.user;
  const resolvedDistrictId = districtId || user?.district || user?.districtId || null;
  const resolvedDistrictName = districtName || user?.districtName || null;
  const originalFileName = fileName || req.file?.originalname || null;

  const result = await upload_manual_event_attendance_service(id, {
    districtId: resolvedDistrictId,
    districtName: resolvedDistrictName,
    stateName,
    skaterExcelDocument,
    fileName: originalFileName,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Skater document uploaded successfully"));
});
