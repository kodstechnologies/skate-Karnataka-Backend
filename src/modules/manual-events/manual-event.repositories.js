import mongoose from "mongoose";
import ManualEvent from "./manual-event.model.js";
import { District } from "../district/district.model.js";

/**
 * Repository: Create a new manual event
 */
const create_manual_event_repositories = async (payload) => {
  return await ManualEvent.create(payload);
};

/**
 * Repository: Find manual events with filters, sorting and pagination
 */
const get_all_manual_events_repositories = async (
  filter = {},
  sort = { createdAt: -1 },
  skip = 0,
  limit = 10
) => {
  return await ManualEvent.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Repository: Count total manual events matching filter
 */
const count_manual_events_repositories = async (filter = {}) => {
  return await ManualEvent.countDocuments(filter);
};

/**
 * Repository: Find single manual event by ID
 */
const get_manual_event_by_id_repositories = async (id) => {
  return await ManualEvent.findById(id).lean();
};

/**
 * Repository: Update manual event by ID
 */
const update_manual_event_repositories = async (id, updatePayload) => {
  return await ManualEvent.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * Repository: Delete manual event by ID
 */
const delete_manual_event_repositories = async (id) => {
  return await ManualEvent.findByIdAndDelete(id).lean();
};

/**
 * Repository: Upload or re-upload district skater Excel document
 */
const upload_attendance_repository = async (
  eventId,
  { districtId, districtName, stateName, skaterExcelDocument }
) => {
  const event = await ManualEvent.findById(eventId);
  if (!event) return null;

  if (!event.attendance) {
    event.attendance = [];
  }

  let resolvedDistrictId =
    districtId && mongoose.isValidObjectId(districtId)
      ? new mongoose.Types.ObjectId(districtId)
      : null;
  let resolvedDistrictName = districtName ? String(districtName).trim() : null;

  // If districtId is provided but districtName is missing, resolve from District collection
  if (resolvedDistrictId && !resolvedDistrictName) {
    try {
      const dist = await District.findById(resolvedDistrictId).select("name").lean();
      if (dist?.name) resolvedDistrictName = dist.name;
    } catch (e) {
      // ignore
    }
  }

  // If districtName is provided but districtId is missing, resolve from District collection
  if (!resolvedDistrictId && resolvedDistrictName) {
    try {
      const dist = await District.findOne({
        name: new RegExp(`^${resolvedDistrictName}$`, "i"),
      })
        .select("_id name")
        .lean();
      if (dist) {
        resolvedDistrictId = dist._id;
        resolvedDistrictName = dist.name;
      }
    } catch (e) {
      // ignore
    }
  }

  // Look for existing attendance for this district
  const existingIndex = event.attendance.findIndex((item) => {
    if (
      resolvedDistrictId &&
      item.districtId &&
      String(item.districtId) === String(resolvedDistrictId)
    ) {
      return true;
    }
    if (
      resolvedDistrictName &&
      item.districtName &&
      item.districtName.toLowerCase() === resolvedDistrictName.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (existingIndex >= 0) {
    // Re-upload: update existing district attendance
    event.attendance[existingIndex].skaterExcelDocument = skaterExcelDocument;
    if (resolvedDistrictId) event.attendance[existingIndex].districtId = resolvedDistrictId;
    if (resolvedDistrictName) event.attendance[existingIndex].districtName = resolvedDistrictName;
    if (stateName) event.attendance[existingIndex].stateName = stateName;
    event.attendance[existingIndex].uploadedAt = new Date();
  } else {
    // New submission
    event.attendance.push({
      districtId: resolvedDistrictId,
      districtName: resolvedDistrictName,
      stateName: stateName || resolvedDistrictName || "Karnataka",
      skaterExcelDocument,
      uploadedAt: new Date(),
    });
  }

  await event.save();
  return event.toObject();
};

export {
  create_manual_event_repositories,
  get_all_manual_events_repositories,
  count_manual_events_repositories,
  get_manual_event_by_id_repositories,
  update_manual_event_repositories,
  delete_manual_event_repositories,
  upload_attendance_repository,
};
