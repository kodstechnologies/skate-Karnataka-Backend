import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import {
  create_manual_event_repositories,
  get_all_manual_events_repositories,
  count_manual_events_repositories,
  get_manual_event_by_id_repositories,
  update_manual_event_repositories,
  delete_manual_event_repositories,
  upload_attendance_repository,
} from "./manual-event.repositories.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const parseJsonIfNeeded = (val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return val;
      }
    }
    return trimmed;
  }
  return val;
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

const VALID_STATUSES = Object.freeze([
  "draft",
  "published",
  "ongoing",
  "completed",
  "cancelled",
]);

/**
 * Service: Create a new manual event
 */
const create_manual_event_service = async (payload = {}) => {
  const {
    title,
    description,
    status,
    entryFee,
    eventCategory,
    discipline,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    eventStartTime,
    eventEndTime,
    address,
    backgroundColor1,
    backgroundColor2,
    textColor,
    circularDocument,
    excelTemplate,
    attendance,
  } = payload;

  if (!title || !String(title).trim()) {
    throw new AppError("Event title is required", 400);
  }

  const eventData = {
    title: String(title).trim(),
  };

  if (description !== undefined) {
    eventData.description = description ? String(description).trim() : null;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    eventData.status = status;
  }

  if (entryFee !== undefined) {
    const parsedFee = Number(entryFee);
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      throw new AppError("Entry fee must be a non-negative number", 400);
    }
    eventData.entryFee = parsedFee;
  }

  if (eventCategory !== undefined) {
    eventData.eventCategory = eventCategory ? String(eventCategory).trim() : null;
  }

  if (discipline !== undefined) {
    eventData.discipline = discipline ? String(discipline).trim() : null;
  }

  if (registrationStartDate !== undefined) eventData.registrationStartDate = parseDate(registrationStartDate);
  if (registrationEndDate !== undefined) eventData.registrationEndDate = parseDate(registrationEndDate);
  if (startDate !== undefined) eventData.startDate = parseDate(startDate);
  if (endDate !== undefined) eventData.endDate = parseDate(endDate);

  if (eventStartTime !== undefined) {
    eventData.eventStartTime = eventStartTime ? String(eventStartTime).trim() : null;
  }
  if (eventEndTime !== undefined) {
    eventData.eventEndTime = eventEndTime ? String(eventEndTime).trim() : null;
  }
  if (address !== undefined) {
    eventData.address = address ? String(address).trim() : null;
  }

  if (backgroundColor1 !== undefined) eventData.backgroundColor1 = String(backgroundColor1).trim();
  if (backgroundColor2 !== undefined) eventData.backgroundColor2 = String(backgroundColor2).trim();
  if (textColor !== undefined) eventData.textColor = String(textColor).trim();

  if (circularDocument !== undefined) eventData.circularDocument = circularDocument || null;
  if (excelTemplate !== undefined) eventData.excelTemplate = excelTemplate || null;

  if (attendance !== undefined) {
    const parsedAttendance = parseJsonIfNeeded(attendance);
    if (Array.isArray(parsedAttendance)) {
      eventData.attendance = parsedAttendance.map((item) => ({
        stateName: String(item.stateName || "").trim(),
        skaterExcelDocument: String(item.skaterExcelDocument || "").trim(),
      }));
    }
  }

  return await create_manual_event_repositories(eventData);
};

/**
 * Service: Update an existing manual event
 */
const update_manual_event_service = async (id, payload = {}) => {
  if (!isValidObjectId(id)) {
    throw new AppError("Invalid manual event ID", 400);
  }

  const existing = await get_manual_event_by_id_repositories(id);
  if (!existing) {
    throw new AppError("Manual event not found", 404);
  }

  const update = {};
  const {
    title,
    description,
    status,
    entryFee,
    eventCategory,
    discipline,
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    eventStartTime,
    eventEndTime,
    address,
    backgroundColor1,
    backgroundColor2,
    textColor,
    circularDocument,
    excelTemplate,
    attendance,
  } = payload;

  if (title !== undefined) {
    if (!String(title).trim()) {
      throw new AppError("Event title cannot be empty", 400);
    }
    update.title = String(title).trim();
  }

  if (description !== undefined) {
    update.description = description ? String(description).trim() : null;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    update.status = status;
  }

  if (entryFee !== undefined) {
    const parsedFee = Number(entryFee);
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      throw new AppError("Entry fee must be a non-negative number", 400);
    }
    update.entryFee = parsedFee;
  }

  if (eventCategory !== undefined) {
    update.eventCategory = eventCategory ? String(eventCategory).trim() : null;
  }

  if (discipline !== undefined) {
    update.discipline = discipline ? String(discipline).trim() : null;
  }

  if (registrationStartDate !== undefined) update.registrationStartDate = parseDate(registrationStartDate);
  if (registrationEndDate !== undefined) update.registrationEndDate = parseDate(registrationEndDate);
  if (startDate !== undefined) update.startDate = parseDate(startDate);
  if (endDate !== undefined) update.endDate = parseDate(endDate);

  if (eventStartTime !== undefined) {
    update.eventStartTime = eventStartTime ? String(eventStartTime).trim() : null;
  }
  if (eventEndTime !== undefined) {
    update.eventEndTime = eventEndTime ? String(eventEndTime).trim() : null;
  }
  if (address !== undefined) {
    update.address = address ? String(address).trim() : null;
  }

  if (backgroundColor1 !== undefined) update.backgroundColor1 = String(backgroundColor1).trim();
  if (backgroundColor2 !== undefined) update.backgroundColor2 = String(backgroundColor2).trim();
  if (textColor !== undefined) update.textColor = String(textColor).trim();

  if (circularDocument !== undefined) update.circularDocument = circularDocument || null;
  if (excelTemplate !== undefined) update.excelTemplate = excelTemplate || null;

  if (attendance !== undefined) {
    const parsedAttendance = parseJsonIfNeeded(attendance);
    if (Array.isArray(parsedAttendance)) {
      update.attendance = parsedAttendance.map((item) => ({
        stateName: String(item.stateName || "").trim(),
        skaterExcelDocument: String(item.skaterExcelDocument || "").trim(),
      }));
    }
  }

  return await update_manual_event_repositories(id, update);
};

/**
 * Service: Get all manual events with search, filter, pagination
 */
const get_all_manual_events_service = async (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.status) {
    filter.status = String(query.status).trim();
  }

  if (query.eventCategory) {
    filter.eventCategory = String(query.eventCategory).trim();
  }

  if (query.discipline) {
    filter.discipline = String(query.discipline).trim();
  }

  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), "i");
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { eventCategory: searchRegex },
      { discipline: searchRegex },
      { address: searchRegex },
    ];
  }

  const sort = { createdAt: -1 };

  const [events, total] = await Promise.all([
    get_all_manual_events_repositories(filter, sort, skip, limit),
    count_manual_events_repositories(filter),
  ]);

  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Service: Get one manual event by ID
 */
const get_manual_event_by_id_service = async (id) => {
  if (!isValidObjectId(id)) {
    throw new AppError("Invalid manual event ID", 400);
  }

  const event = await get_manual_event_by_id_repositories(id);
  if (!event) {
    throw new AppError("Manual event not found", 404);
  }

  return event;
};

/**
 * Service: Delete a manual event by ID
 */
const delete_manual_event_service = async (id) => {
  if (!isValidObjectId(id)) {
    throw new AppError("Invalid manual event ID", 400);
  }

  const deleted = await delete_manual_event_repositories(id);
  if (!deleted) {
    throw new AppError("Manual event not found", 404);
  }

  return deleted;
};

/**
 * Service: Upload or re-upload district attendance Excel file
 */
const upload_manual_event_attendance_service = async (eventId, data = {}) => {
  if (!isValidObjectId(eventId)) {
    throw new AppError("Invalid manual event ID", 400);
  }

  if (!data?.skaterExcelDocument) {
    throw new AppError("Skater Excel document is required", 400);
  }

  const result = await upload_attendance_repository(eventId, data);
  if (!result) {
    throw new AppError("Manual event not found", 404);
  }

  return result;
};

export {
  create_manual_event_service,
  update_manual_event_service,
  get_all_manual_events_service,
  get_manual_event_by_id_service,
  delete_manual_event_service,
  upload_manual_event_attendance_service,
};
