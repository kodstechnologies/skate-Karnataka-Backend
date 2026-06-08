import { Event } from "./event.model.js";
import SkatingEventCategory from "./SkatingEventCategory.model.js";
import {
  buildVisibleCategoriesFilter,
  CATEGORY_STATUS,
  legacyStandardCategoryClause,
} from "./skatingEventCategory.policy.js";
import {
  buildOverridePayloadFromInput,
  extractCustomCategoryRowsFromDoc,
  extractCustomNamesFromDoc,
  getDistrictOverrideFromStandardDoc,
  getClubOverrideFromStandardDoc,
  mergeStandardWithOrgOverride,
  resolveSkatingCategoriesForEvent,
} from "./skatingEventCategory.sync.js";
import { EventParticipant } from "./eventParticipant.model.js";
import { GeneratedCertificate } from "../certificate/generatedCertificate.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";
import {
  approvedPublicEventFilter,
  EVENT_ADMIN_APPROVAL,
  EVENT_DELETE_APPROVAL,
  initialAdminApprovalStatus,
  isEventPubliclyVisible,
  registrationStillOpenFilter,
  skaterListableEventsFilter,
  requiresAdminApprovalOnCreate,
} from "./eventApprovalPolicy.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { resolveDistrictOwnerIdRepositories } from "../gallery/gallery.repositories.js";
import { State } from "../state/state.model.js";
import mongoose from "mongoose";
import {
  sendNotification,
  notifyClubSkatersOfNewEvent,
  notifyDistrictMembersOfNewEvent,
  notifyStateMembersOfNewEvent,
  notifyStateLevelOnEventPendingApproval,
  notifySkaterCertificationApproved,
} from "../../util/firebase/sendNotification.js";
import { AppError } from "../../util/common/AppError.js";
import { assignCompetitionRanks } from "../../util/competition/rankUtil.js";
import { SkaterChestNo } from "../competition/SkaterChestNo.model.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeAttendanceStatus = (status) =>
  status === "apsent" ? "absent" : status;

/** timeTaken 0 → absent; any other numeric time → attend; else keep current / pending. */
const resolveAttendanceFromTimeTaken = (timeTaken, explicitStatus, currentStatus = "pending") => {
  if (explicitStatus !== undefined) {
    return normalizeAttendanceStatus(explicitStatus);
  }
  if (timeTaken === 0) {
    return "absent";
  }
  if (timeTaken != null && typeof timeTaken === "number" && !Number.isNaN(timeTaken)) {
    return "attend";
  }
  return currentStatus || "pending";
};

/** Club JWT is usually a member (BaseAuth _id listed on `Club.members`); events store the Club document _id in `eventFor`. */
export const resolveClubIdForClubAuthUser = async (authUserId) => {
  const clubByMember = await Club.findOne({
    members: new mongoose.Types.ObjectId(authUserId),
  })
    .select("_id")
    .lean();

  if (clubByMember?._id) {
    return clubByMember._id;
  }

  const clubById = await Club.findById(authUserId).select("_id").lean();
  if (clubById?._id) {
    return clubById._id;
  }

  throw new AppError("Club not found for this token", 403);
};

/**
 * Skater-visible events: all State + District (club's district) + Club (skater's club).
 * District is resolved from the club document, not the skater profile.
 */
export const resolveSkaterEventScope = async (userId) => {
  const skater = await Skater.findById(userId).select("club category").lean();
  if (!skater) {
    return null;
  }

  let districtId = null;
  const clubId = skater.club || null;

  if (clubId) {
    const club = await Club.findById(clubId).select("district").lean();
    districtId = club?.district || null;
  }

  return {
    skaterCategory: skater.category || null,
    clubId,
    districtId,
  };
};

const toObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    return null;
  }
  return new mongoose.Types.ObjectId(String(id));
};

/** Org events may reference org doc _id or legacy auth member _id on that org. */
const buildOrgEventForMatch = (primaryId, memberIds = []) => {
  const ids = new Set();
  const primaryOid = toObjectId(primaryId);
  if (primaryOid) {
    ids.add(String(primaryOid));
  }
  for (const memberId of memberIds) {
    const oid = toObjectId(memberId);
    if (oid) {
      ids.add(String(oid));
    }
  }

  const objectIds = [...ids].map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) {
    return null;
  }
  if (objectIds.length === 1) {
    return objectIds[0];
  }
  return { $in: objectIds };
};

const buildSkaterVisibleEventsOrClause = ({
  clubId,
  districtId,
  districtMemberIds = [],
  clubMemberIds = [],
}) => {
  const clauses = [{ eventType: "State" }];

  const districtEventFor = buildOrgEventForMatch(districtId, districtMemberIds);
  if (districtEventFor) {
    clauses.push({
      eventType: "District",
      eventFor: districtEventFor,
    });
  }

  const clubEventFor = buildOrgEventForMatch(clubId, clubMemberIds);
  if (clubEventFor) {
    clauses.push({
      eventType: "Club",
      eventFor: clubEventFor,
    });
  }

  return clauses;
};

const loadDistrictMemberIds = async (districtId) => {
  if (!districtId) {
    return [];
  }
  const district = await District.findById(districtId).select("members").lean();
  return (district?.members || []).map((id) => String(id));
};

const loadClubMemberIds = async (clubId) => {
  if (!clubId) {
    return [];
  }
  const club = await Club.findById(clubId).select("members").lean();
  return (club?.members || []).map((id) => String(id));
};

/**
 * Events store standard SkatingEventCategory ids; skater.category may be another
 * document id with the same typeName — match all peer category ids.
 */
const buildSkaterCategoryMatchClause = async (skaterCategoryId) => {
  const skaterOid = toObjectId(skaterCategoryId);
  if (!skaterOid) {
    return null;
  }

  const idSet = new Set([String(skaterOid)]);
  const skaterCat = await SkatingEventCategory.findById(skaterOid)
    .select("typeName")
    .lean();

  const typeName = String(skaterCat?.typeName || "").trim();
  if (typeName) {
    const peers = await SkatingEventCategory.find({
      typeName: { $regex: new RegExp(`^${typeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    })
      .select("_id")
      .lean();

    for (const peer of peers) {
      idSet.add(String(peer._id));
    }
  }

  const objectIds = [...idSet].map((id) => new mongoose.Types.ObjectId(id));
  return { skatingEventCategories: { $in: objectIds } };
};

const resolveEventForDocId = (eventFor) => {
  if (!eventFor) {
    return null;
  }
  if (typeof eventFor === "object" && eventFor._id) {
    return eventFor._id;
  }
  return eventFor;
};

const skaterOwnsDistrictEvent = (event, districtId, districtMemberIds = []) => {
  const ownerId = resolveEventForDocId(event.eventFor);
  if (!ownerId || !districtId) {
    return false;
  }
  if (String(ownerId) === String(districtId)) {
    return true;
  }
  return districtMemberIds.some((memberId) => String(ownerId) === String(memberId));
};

const skaterOwnsClubEvent = (event, clubId, clubMemberIds = []) => {
  const ownerId = resolveEventForDocId(event.eventFor);
  if (!ownerId || !clubId) {
    return false;
  }
  if (String(ownerId) === String(clubId)) {
    return true;
  }
  return clubMemberIds.some((memberId) => String(ownerId) === String(memberId));
};

const displayAllEventRepository = async ({ page, limit }) => {

  const { skip, limit: pageLimit, page: currentPage } =
    paginate(page, limit);

  const events = await Event.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments();

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data: events
  };
};

const CATEGORY_FORMULA_POPULATE = [
  "ageGroups.categories.formula",
  "customCategoryNames.formula",
  "clubOverrides.ageGroups.categories.formula",
  "clubOverrides.customCategoryNames.formula",
  "districtOverrides.ageGroups.categories.formula",
  "districtOverrides.customCategoryNames.formula",
];

export const getVisibleSkatingEventCategoriesRepository = async ({ clubId, districtId } = {}) => {
  const filter = buildVisibleCategoriesFilter({ clubId, districtId });
  return SkatingEventCategory.find(filter)
    .populate(CATEGORY_FORMULA_POPULATE)
    .sort({ typeName: 1, createdAt: -1 })
    .lean();
};

/** All standard (super admin) skating event category documents. */
export const listStandardSkatingEventCategoriesRepository = async () => {
  return SkatingEventCategory.find(legacyStandardCategoryClause())
    .populate(CATEGORY_FORMULA_POPULATE)
    .sort({ typeName: 1, createdAt: -1 })
    .lean();
};

export const getAllEventCategoriesRepository = async ({ page, limit, filter = {} }) => {
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const data = await SkatingEventCategory.find(filter)
    .populate(CATEGORY_FORMULA_POPULATE)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await SkatingEventCategory.countDocuments(filter);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data,
  };
};

export const getEventCategoryByIdRepository = async (id) => {
  return await SkatingEventCategory.findById(id)
    .populate(CATEGORY_FORMULA_POPULATE)
    .lean();
};

export const createEventCategoryRepository = async (payload) => {
  const doc = await SkatingEventCategory.create(payload);
  return SkatingEventCategory.findById(doc._id)
    .populate(CATEGORY_FORMULA_POPULATE)
    .lean();
};

export const updateEventCategoryRepository = async (id, payload) => {
  return await SkatingEventCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate(CATEGORY_FORMULA_POPULATE)
    .lean();
};

export const deleteEventCategoryRepository = async (id) => {
  return await SkatingEventCategory.findByIdAndDelete(id).lean();
};

export const findOrgCustomCategoryRepository = async ({ clubId, districtId } = {}) => {
  const filter = { categoryStatus: CATEGORY_STATUS.CUSTOM };

  if (clubId) {
    filter.club = clubId;
  } else if (districtId) {
    filter.district = districtId;
  } else {
    return null;
  }

  return SkatingEventCategory.findOne(filter)
    .populate(CATEGORY_FORMULA_POPULATE)
    .lean();
};

export const upsertClubOverrideOnCategoryRepository = async (categoryId, clubId, input = {}) => {
  const payload = buildOverridePayloadFromInput(input);
  const doc = await SkatingEventCategory.findById(categoryId);
  if (!doc) {
    throw new AppError("Event category not found", 404);
  }

  const entry = {
    club: clubId,
    typeName: payload.typeName,
    customCategoryNames: payload.customCategoryNames,
    ageGroups: payload.ageGroups,
  };

  const idx = (doc.clubOverrides || []).findIndex((row) => String(row.club) === String(clubId));

  if (idx >= 0) {
    Object.assign(doc.clubOverrides[idx], entry);
  } else {
    doc.clubOverrides.push(entry);
  }

  await doc.save();
  await doc.populate(CATEGORY_FORMULA_POPULATE);
  return doc.toObject();
};

export const upsertDistrictOverrideOnCategoryRepository = async (
  categoryId,
  districtId,
  input = {}
) => {
  const payload = buildOverridePayloadFromInput(input);
  const doc = await SkatingEventCategory.findById(categoryId);
  if (!doc) {
    throw new AppError("Event category not found", 404);
  }

  const entry = {
    district: districtId,
    typeName: payload.typeName,
    customCategoryNames: payload.customCategoryNames,
    ageGroups: payload.ageGroups,
  };

  const idx = (doc.districtOverrides || []).findIndex(
    (row) => String(row.district) === String(districtId)
  );

  if (idx >= 0) {
    Object.assign(doc.districtOverrides[idx], entry);
  } else {
    doc.districtOverrides.push(entry);
  }

  await doc.save();
  await doc.populate(CATEGORY_FORMULA_POPULATE);
  return doc.toObject();
};

/** Save org custom names into districtOverrides / clubOverrides on every standard category. */
export const syncOrgOverrideToAllStandardsRepository = async ({
  clubId = null,
  districtId = null,
  typeName,
  customCategoryNames = [],
}) => {
  const standards = await listStandardSkatingEventCategoriesRepository();
  if (!standards.length) {
    throw new AppError("No standard event categories exist yet. Ask super admin to create them.", 400);
  }

  const input = {
    typeName:
      typeName?.trim() ||
      (clubId ? "Club custom categories" : "District custom categories"),
    customCategoryNames,
  };

  const updated = [];
  for (const cat of standards) {
    if (clubId) {
      updated.push(await upsertClubOverrideOnCategoryRepository(cat._id, clubId, input));
    } else if (districtId) {
      updated.push(await upsertDistrictOverrideOnCategoryRepository(cat._id, districtId, input));
    }
  }

  return updated[updated.length - 1];
};

export const deleteLegacyOrgCustomCategoryRepository = async ({ clubId, districtId } = {}) => {
  const filter = { categoryStatus: CATEGORY_STATUS.CUSTOM };
  if (clubId) {
    filter.club = clubId;
  } else if (districtId) {
    filter.district = districtId;
  } else {
    return null;
  }

  return SkatingEventCategory.findOneAndDelete(filter).lean();
};

/** Summary for org-custom API from embedded overrides (first standard) or legacy custom doc. */
export const findOrgOverrideSummaryRepository = async ({ clubId, districtId } = {}) => {
  const standards = await listStandardSkatingEventCategoriesRepository();

  if (standards.length) {
    const first = standards[0];
    const override = clubId
      ? getClubOverrideFromStandardDoc(first, clubId)
      : getDistrictOverrideFromStandardDoc(first, districtId);

    const names = extractCustomNamesFromDoc(override);
    if (override && names.length) {
      return {
        _id: first._id,
        categoryStatus: CATEGORY_STATUS.STANDARD,
        typeName: override.typeName?.trim() || first.typeName,
        customCategoryNames: override.customCategoryNames,
        ageGroups: override.ageGroups,
        club: clubId || null,
        district: districtId || null,
        _fromEmbeddedOverride: true,
      };
    }
  }

  return findOrgCustomCategoryRepository({ clubId, districtId });
};

export const orgHasEmbeddedOverridesRepository = async ({ clubId, districtId } = {}) => {
  const standards = await listStandardSkatingEventCategoriesRepository();

  return standards.some((cat) => {
    const override = clubId
      ? getClubOverrideFromStandardDoc(cat, clubId)
      : getDistrictOverrideFromStandardDoc(cat, districtId);
    return extractCustomNamesFromDoc(override).length > 0;
  });
};

export const listMergedStandardCategoriesForOrgRepository = async ({
  clubId = null,
  districtId = null,
} = {}) => {
  const standards = await listStandardSkatingEventCategoriesRepository();
  return standards.map((cat) => mergeStandardWithOrgOverride(cat, { clubId, districtId }));
};

export const upsertOrgCustomCategoryRepository = async ({
  clubId = null,
  districtId = null,
  typeName,
  customCategoryNames = [],
}) => {
  const doc = await syncOrgOverrideToAllStandardsRepository({
    clubId,
    districtId,
    typeName,
    customCategoryNames,
  });

  await deleteLegacyOrgCustomCategoryRepository({ clubId, districtId });

  const summary = await findOrgOverrideSummaryRepository({ clubId, districtId });
  return {
    ...(summary || doc),
    customCategoryNames: extractCustomCategoryRowsFromDoc(summary || doc),
  };
};

export const getRegisterFormByUserIdRepository = async (userId) => {
  const registrations = await EventParticipant.find({ userId })
    .sort({ createdAt: -1 })
    .populate("eventId", "header")
    .lean();

  return registrations.map((item) => ({
    id: item._id,
    eventId: item.eventId?._id || null,
    eventName: item.eventId?.header || "",
    ageGroup: item.ageGroup,
    paymentStatus: item.paymentStatus,
  }));
};

const REGISTER_FORM_POPULATE = [
  {
    path: "eventId",
    select:
      "header registerStartDate registerEndDate eventStartDate eventEndDate eventStartTime eventEndTime address eventType status",
  },
  { path: "userId", select: "phone countryCode" },
];

const REGISTER_DETAILS_POPULATE = [
  {
    path: "eventId",
    select:
      "header about registerStartDate registerEndDate eventStartDate eventEndDate eventStartTime eventEndTime address eventType status entryFee colorOne colorTwo textColor",
  },
  { path: "categoriesId", select: "_id typeName" },
  { path: "userId", select: "fullName krsaId" },
];

const resolveChestNoForRegistration = (chestDocs = [], item) => {
  if (!item) {
    return "";
  }

  const eventId = String(item.eventId?._id || item.eventId || "");
  const ageGroup = String(item.ageGroup || "").trim();
  const krsaId = String(item.userId?.krsaId || "").trim();
  const fullName = String(item.userId?.fullName || item.name || "")
    .trim()
    .toLowerCase();

  const eventRows = chestDocs.filter((row) => String(row.eventId) === eventId);

  const matched =
    eventRows.find(
      (row) =>
        String(row.ageGroup || "").trim() === ageGroup &&
        ((krsaId && row.krsaId && String(row.krsaId).trim() === krsaId) ||
          String(row.fullName || "").trim().toLowerCase() === fullName)
    ) ||
    eventRows.find(
      (row) =>
        (krsaId && row.krsaId && String(row.krsaId).trim() === krsaId) ||
        String(row.fullName || "").trim().toLowerCase() === fullName
    );

  return matched?.chestNo ? String(matched.chestNo) : "";
};

const loadChestDocsForRegistrations = async (items = []) => {
  const eventIds = [
    ...new Set(
      items
        .map((item) => item?.eventId?._id || item?.eventId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
        .map((id) => new mongoose.Types.ObjectId(String(id)))
    ),
  ];

  if (!eventIds.length) {
    return [];
  }

  return SkaterChestNo.find({ eventId: { $in: eventIds } })
    .select("eventId ageGroup krsaId fullName chestNo")
    .lean();
};

const formatRegisterFormDetails = (item) => {
  if (!item) return null;

  return {
    id: item._id,
    phone: item.userId?.phone || "",
    countryCode: item.userId?.countryCode || "+91",
    event: item.eventId
      ? {
          id: item.eventId._id,
          header: item.eventId.header || "",
          registerStartDate: item.eventId.registerStartDate || null,
          registerEndDate: item.eventId.registerEndDate || null,
          eventStartDate: item.eventId.eventStartDate || null,
          eventEndDate: item.eventId.eventEndDate || null,
          eventStartTime: item.eventId.eventStartTime || "",
          eventEndTime: item.eventId.eventEndTime || "",
          address: item.eventId.address || "",
          eventType: item.eventId.eventType || "",
          status: item.eventId.status || "",
        }
      : null,
    eventId: item.eventId?._id || null,
    name: item.name || "",
    categoriesId: item.categoriesId || null,
    ageGroup: item.ageGroup,
    categories: (item.categories || []).map((category) => ({
      ...category,
      attendanceStatus: category?.attendanceStatus || "pending",
    })),
    paymentStatus: item.paymentStatus,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

/** Slim payload for GET /v1/register-details/:eventId */
const formatRegisterDetailsByEvent = (item, chestNo = "") => {
  if (!item) return null;

  const skatingCategory = item.categoriesId;
  const categoryRefId =
    skatingCategory?._id ?? item.categoriesId ?? null;

  return {
    event: item.eventId
      ? {
          id: item.eventId._id,
          header: item.eventId.header || "",
          about: item.eventId.about || "",
          registerStartDate: item.eventId.registerStartDate || null,
          registerEndDate: item.eventId.registerEndDate || null,
          eventStartDate: item.eventId.eventStartDate || null,
          eventEndDate: item.eventId.eventEndDate || null,
          eventStartTime: item.eventId.eventStartTime || "",
          eventEndTime: item.eventId.eventEndTime || "",
          address: item.eventId.address || "",
          eventType: item.eventId.eventType || "",
          status: item.eventId.status || "",
          entryFee: item.eventId.entryFee ?? "",
          colorOne: item.eventId.colorOne ?? "#6A11CB",
          colorTwo: item.eventId.colorTwo ?? "#2575FC",
          textColor: item.eventId.textColor ?? "#FFFFFF",
        }
      : null,
    categoriesId: categoryRefId
      ? {
          _id: categoryRefId,
          name: skatingCategory?.typeName ?? "",
        }
      : null,
    ageGroup: item.ageGroup,
    // certificateID: item.certificateID || "",
    categories: (item.categories || []).map((category) => ({
      _id: category._id,
      name: category.name || "",
    })),
    paymentStatus: item.paymentStatus,
    isRegister: item.paymentStatus === "paid",
    chestNo: chestNo || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const getRegisterFormByIdRepository = async (id, userId) => {
  const item = await EventParticipant.findOne({ _id: id, userId })
    .populate(REGISTER_FORM_POPULATE)
    .lean();

  return formatRegisterFormDetails(item);
};

export const getAllRegisterDetailsByUserIdRepository = async (
  userId,
  { page, limit }
) => {
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const filter = { userId, paymentStatus: "paid" };

  const [total, items] = await Promise.all([
    EventParticipant.countDocuments(filter),
    EventParticipant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate(REGISTER_DETAILS_POPULATE)
      .lean(),
  ]);

  const chestDocs = await loadChestDocsForRegistrations(items);
  const registrations = items
    .map((item) =>
      formatRegisterDetailsByEvent(item, resolveChestNoForRegistration(chestDocs, item))
    )
    .filter(Boolean);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    registrations,
  };
};

export const getRegisterDetailsByEventIdRepository = async (eventId, userId) => {
  const eventObjectId = String(eventId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(eventObjectId)) {
    return null;
  }

  const item = await EventParticipant.findOne({
    eventId: eventObjectId,
    userId,
    paymentStatus: "paid",
  })
    .populate(REGISTER_DETAILS_POPULATE)
    .lean();

  if (!item) {
    return null;
  }

  const chestDocs = await loadChestDocsForRegistrations([item]);
  return formatRegisterDetailsByEvent(
    item,
    resolveChestNoForRegistration(chestDocs, item)
  );
};

const parseEventEndDateTime = (eventEndDate, eventEndTime) => {
  if (!eventEndDate) return null;

  const endDate = new Date(eventEndDate);
  if (Number.isNaN(endDate.getTime())) return null;

  const rawTime = String(eventEndTime || "").trim();
  if (!rawTime) {
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }

  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) {
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = (match[3] || "").toUpperCase();

  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  endDate.setHours(hours, minutes, 0, 0);
  return endDate;
};

/** True when event ended at least 2 full days ago. */
export const isEventEndedPlusTwoDays = (event, referenceDate = new Date()) => {
  const endDateTime = parseEventEndDateTime(event?.eventEndDate, event?.eventEndTime);
  if (!endDateTime) return false;

  const threshold = new Date(endDateTime);
  threshold.setDate(threshold.getDate() + 2);
  return threshold < referenceDate;
};

export const hasParticipantRecordedTime = (participant) =>
  (participant?.categories || []).some(
    (category) =>
      category?.timeTaken != null &&
      typeof category.timeTaken === "number" &&
      !Number.isNaN(category.timeTaken)
  );

/** Event ids from generated certificates where (eventEndDate + 2 days) < now. */
export const getCertificateEventIdsEndedPlusTwoDays = async () => {
  const eventIds = await GeneratedCertificate.distinct("eventId");
  if (!eventIds.length) return [];

  const events = await Event.find({ _id: { $in: eventIds } })
    .select("_id eventEndDate eventEndTime")
    .lean();

  return events.filter(isEventEndedPlusTwoDays).map((event) => event._id);
};

const CERTIFICATION_APPLICATION_VISIBILITY_MS = 2 * 24 * 60 * 60 * 1000;

/** Events whose end date is at least 2 days ago (same rule as skater certificate list). */
export const getCertificationApplicationEligibleEventIds = async () => {
  const twoDaysAgo = new Date(Date.now() - CERTIFICATION_APPLICATION_VISIBILITY_MS);

  const events = await Event.find({
    eventEndDate: { $exists: true, $ne: null, $lte: twoDaysAgo },
  })
    .select("_id")
    .lean();

  return events.map((event) => event._id);
};

const attachDocumentLinksToCertificationApplications = async (rows, isStateCompactView) => {
  if (!Array.isArray(rows) || !rows.length) {
    return rows;
  }

  const participantIds = rows
    .map((row) => row.participantId || row.id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

  if (!participantIds.length) {
    return rows.map((row) => ({
      ...row,
      documentLink: "",
      certificateAvailable: false,
    }));
  }

  const certificates = await GeneratedCertificate.find({
    participantId: { $in: participantIds },
  })
    .select("participantId pdfUrl")
    .sort({ updatedAt: -1 })
    .lean();

  const linkByParticipant = new Map();
  for (const cert of certificates) {
    const participantKey = String(cert.participantId || "");
    const pdfUrl = String(cert.pdfUrl || "").trim();
    if (participantKey && pdfUrl && !linkByParticipant.has(participantKey)) {
      linkByParticipant.set(participantKey, pdfUrl);
    }
  }

  return rows.map((row) => {
    const participantKey = String(row.participantId || row.id || "");
    const documentLink = linkByParticipant.get(participantKey) || "";

    if (isStateCompactView) {
      return {
        ...row,
        documentLink,
        certificateAvailable: Boolean(documentLink),
      };
    }

    return {
      ...row,
      documentLink,
      certificateAvailable: Boolean(documentLink),
    };
  });
};

/**
 * Daily job: for certificate events ended 2+ days ago, auto-approve club step when
 * the skater has a generated certificate, club no longer exists, recorded times exist,
 * and clubAllow is pending. Notifies each affected skater.
 */
export const runDailyMissingClubCertificationJob = async () => {
  const eventIds = await getCertificateEventIdsEndedPlusTwoDays();
  if (!eventIds.length) {
    console.log("Missing-club certification job: no eligible events");
    return { eventsChecked: 0, approved: 0, notified: 0 };
  }

  let approved = 0;
  let notified = 0;

  for (const eventId of eventIds) {
    const certs = await GeneratedCertificate.find({ eventId })
      .select("participantId")
      .lean();

    const certParticipantIds = certs
      .map((row) => row.participantId)
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)));

    if (!certParticipantIds.length) continue;

    const event = await Event.findById(eventId).select("header").lean();
    const eventName = event?.header || "";
    const eventIdStr = String(eventId);

    const participants = await EventParticipant.find({
      eventId,
      _id: { $in: certParticipantIds },
      userId: { $exists: true, $ne: null },
      skaterApply: true,
      clubAllow: { $ne: true },
    })
      .select("_id userId categories skaterApply clubAllow")
      .lean();

    for (const participant of participants) {
      if (!hasParticipantRecordedTime(participant)) continue;

      const skater = await Skater.findById(participant.userId).select("club").lean();
      const clubId = skater?.club;

      if (clubId) {
        const clubExists = await Club.exists({ _id: clubId });
        if (clubExists) continue;
      }

      await EventParticipant.findByIdAndUpdate(participant._id, {
        $set: { clubAllow: true },
      });
      approved += 1;

      const approvalMeta = buildCertificationApprovalMeta(
        "club",
        eventName,
        "KRSA"
      );

      await sendNotification({
        receiverId: participant.userId,
        title: approvalMeta.title,
        body: approvalMeta.body,
        notificationType: "approval",
        sentBy: null,
        data: {
          type: "certification_approved",
          code: approvalMeta.code,
          approvedByRole: "System",
          approvedByName: "KRSA",
          participantId: String(participant._id),
          eventId: eventIdStr,
          eventName,
          source: "missing_club_certification_job",
        },
      });
      notified += 1;
    }
  }

  console.log(
    `Missing-club certification job: events=${eventIds.length}, clubAllow set=${approved}, notified=${notified}`
  );

  return { eventsChecked: eventIds.length, approved, notified };
};

const PARTICIPANT_CERT_SELECT = "_id eventId userId skaterApply updatedAt paymentStatus";

/** Resolve the logged-in skater's participant from participant id, event id, or a sibling participant id. */
const resolveSkaterEventParticipant = async (idParam, userId) => {
  if (
    !mongoose.Types.ObjectId.isValid(String(idParam || "")) ||
    !mongoose.Types.ObjectId.isValid(String(userId || ""))
  ) {
    return null;
  }

  const userOid = new mongoose.Types.ObjectId(String(userId));
  const idOid = new mongoose.Types.ObjectId(String(idParam));

  let participant = await EventParticipant.findOne({
    _id: idOid,
    userId: userOid,
  })
    .select(PARTICIPANT_CERT_SELECT)
    .lean();

  if (participant) return participant;

  participant = await EventParticipant.findOne({
    eventId: idOid,
    userId: userOid,
  })
    .select(PARTICIPANT_CERT_SELECT)
    .lean();

  if (participant) return participant;

  const foreignParticipant = await EventParticipant.findById(idOid)
    .select("eventId")
    .lean();

  if (foreignParticipant?.eventId) {
    participant = await EventParticipant.findOne({
      eventId: foreignParticipant.eventId,
      userId: userOid,
    })
      .select(PARTICIPANT_CERT_SELECT)
      .lean();
  }

  return participant || null;
};

export const applyCertificationBySkaterRepository = async (participantId, userId) => {
  const existing = await resolveSkaterEventParticipant(participantId, userId);

  if (!existing) {
    return { participant: null, alreadyApplied: false };
  }

  if (existing.skaterApply) {
    return { participant: existing, alreadyApplied: true };
  }

  const updated = await EventParticipant.findOneAndUpdate(
    { _id: existing._id, userId: new mongoose.Types.ObjectId(String(userId)) },
    { $set: { skaterApply: true } },
    { new: true }
  )
    .select(PARTICIPANT_CERT_SELECT)
    .lean();

  return { participant: updated, alreadyApplied: false };
};

export const getAllPlayedEventsBySkaterRepository = async (
  userId,
  { page = 1, limit = 10 } = {}
) => {
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const emptyResult = () => ({
    data: [],
    pagination: {
      total: 0,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(0, pageLimit),
    },
  });

  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    return emptyResult();
  }

  const skaterObjectId = new mongoose.Types.ObjectId(String(userId));

  const rows = await EventParticipant.find({
    userId: { $exists: true, $ne: null, $eq: skaterObjectId },
    eventId: { $exists: true, $ne: null },
  })
    .select("eventId userId skaterApply paymentStatus createdAt")
    .populate({
      path: "eventId",
      select: "header eventType eventStartDate eventEndDate eventEndTime address status",
    })
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  const seenEventIds = new Set();

  const data = [];
  for (const row of rows) {
    if (!row.userId || String(row.userId) !== String(skaterObjectId)) {
      continue;
    }

    const event = row.eventId;
    if (!event?._id) continue;

    const endDateTime = parseEventEndDateTime(event.eventEndDate, event.eventEndTime);
    if (!endDateTime || now <= endDateTime) continue;

    const eventIdStr = String(event._id);
    if (seenEventIds.has(eventIdStr)) continue;
    seenEventIds.add(eventIdStr);

    data.push({
      participantId: row._id,
      eventId: event._id,
      userId: row.userId,
      eventName: event.header || "",
      eventType: event.eventType || "",
      eventStartDate: event.eventStartDate || null,
      eventEndDate: event.eventEndDate || null,
      eventEndTime: event.eventEndTime || "",
      address: event.address || "",
      status: event.status || "",
      skaterApply: Boolean(row.skaterApply),
      paymentStatus: row.paymentStatus || "pending",
      documentLink: "",
    });
  }

  const total = data.length;
  const paginatedData = data.slice(skip, skip + pageLimit);

  if (paginatedData.length > 0) {
    const userOid = new mongoose.Types.ObjectId(String(userId));
    const eventOids = paginatedData.map((item) => item.eventId);
    const participantOids = paginatedData.map((item) => item.participantId);

    const orConditions = [{ userId: userOid, eventId: { $in: eventOids } }];
    if (participantOids.length > 0) {
      orConditions.push({
        participantId: { $in: participantOids },
        eventId: { $in: eventOids },
      });
    }

    const certificates = await GeneratedCertificate.find({ $or: orConditions })
      .select("eventId participantId userId pdfUrl")
      .sort({ updatedAt: -1 })
      .lean();

    const documentLinkByUserAndEvent = new Map();
    const documentLinkByParticipantAndEvent = new Map();
    for (const cert of certificates) {
      const pdfUrl = cert.pdfUrl?.trim() || "";
      if (!pdfUrl) continue;

      const eventKey = String(cert.eventId);
      const userKey = `${String(cert.userId)}:${eventKey}`;
      if (cert.userId && !documentLinkByUserAndEvent.has(userKey)) {
        documentLinkByUserAndEvent.set(userKey, pdfUrl);
      }

      const participantKey = `${String(cert.participantId)}:${eventKey}`;
      if (cert.participantId && !documentLinkByParticipantAndEvent.has(participantKey)) {
        documentLinkByParticipantAndEvent.set(participantKey, pdfUrl);
      }
    }

    for (const item of paginatedData) {
      const eventKey = String(item.eventId);
      const userKey = `${String(userOid)}:${eventKey}`;
      const participantKey = `${String(item.participantId)}:${eventKey}`;
      item.documentLink =
        documentLinkByUserAndEvent.get(userKey) ||
        documentLinkByParticipantAndEvent.get(participantKey) ||
        "";
    }
  }

  return {
    data: paginatedData,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const displayCertificationApplicationsRepository = async (
  reqUser,
  { page = 1, limit = 10 } = {}
) => {
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const role = String(reqUser?.role || "").trim().toLowerCase();

  const eligibleEventIds = await getCertificationApplicationEligibleEventIds();
  if (!eligibleEventIds.length) {
    return {
      data: [],
      pagination: {
        total: 0,
        page: currentPage,
        limit: pageLimit,
        totalPages: calcTotalPages(0, pageLimit),
      },
    };
  }

  const baseMatch = {
    skaterApply: true,
    eventId: { $in: eligibleEventIds },
  };

  if (role === "club") {
    baseMatch.clubAllow = { $ne: true };
  } else if (role === "district") {
    baseMatch.clubAllow = true;
    baseMatch.districtAllow = { $ne: true };
  } else if (role === "state" || role === "admin") {
    baseMatch.clubAllow = true;
    baseMatch.districtAllow = true;
    baseMatch.stateAllow = { $ne: true };
  }

  const isStateCompactView = role === "state" || role === "admin";

  const pipeline = [{ $match: baseMatch }];

  pipeline.push(
    {
      $lookup: {
        from: Event.collection.name,
        localField: "eventId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: BaseAuth.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Skater.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "skaterProfile",
      },
    },
    { $unwind: { path: "$skaterProfile", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Club.collection.name,
        localField: "skaterProfile.club",
        foreignField: "_id",
        as: "club",
      },
    },
    { $unwind: { path: "$club", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: District.collection.name,
        localField: "club.district",
        foreignField: "_id",
        as: "district",
      },
    },
    { $unwind: { path: "$district", preserveNullAndEmptyArrays: true } }
  );

  if (role === "club") {
    const resolvedClubId = await resolveClubIdForClubAuthUser(reqUser._id);
    pipeline.push({
      $match: { "skaterProfile.club": new mongoose.Types.ObjectId(resolvedClubId) },
    });
  } else if (role === "district") {
    const districtUser = await BaseAuth.findById(reqUser._id).select("district").lean();
    const districtId = districtUser?.district || reqUser._id;
    pipeline.push({
      $match: { "club.district": new mongoose.Types.ObjectId(districtId) },
    });
  }

  const projectStage = isStateCompactView
    ? {
        $project: {
          _id: 0,
          type: { $literal: "certificateRequest" },
          id: "$_id",
          participantId: "$_id",
          krsaId: { $ifNull: ["$user.krsaId", ""] },
          fullName: { $ifNull: ["$user.fullName", "$name"] },
          clubId: { $ifNull: ["$club.clubId", ""] },
          clubName: { $ifNull: ["$club.name", ""] },
          eventName: { $ifNull: ["$event.header", ""] },
          eventType: { $ifNull: ["$event.eventType", ""] },
          ageGroup: { $ifNull: ["$ageGroup", ""] },
          districtName: { $ifNull: ["$district.name", ""] },
          skaterApply: { $toBool: "$skaterApply" },
          clubAllow: { $toBool: "$clubAllow" },
          districtAllow: { $toBool: "$districtAllow" },
          stateAllow: { $toBool: "$stateAllow" },
          paymentStatus: { $ifNull: ["$paymentStatus", "pending"] },
          colorOne: { $ifNull: ["$event.colorOne", "#6A11CB"] },
          colorTwo: { $ifNull: ["$event.colorTwo", "#2575FC"] },
          textColor: { $ifNull: ["$event.textColor", "#FFFFFF"] },
        },
      }
    : {
        $project: {
          _id: 0,
          participantId: "$_id",
          event: {
            _id: "$event._id",
            header: { $ifNull: ["$event.header", ""] },
            eventType: { $ifNull: ["$event.eventType", ""] },
            eventStartDate: "$event.eventStartDate",
            eventEndDate: "$event.eventEndDate",
          },
          skater: {
            _id: "$user._id",
            fullName: { $ifNull: ["$user.fullName", "$name"] },
            krsaId: { $ifNull: ["$user.krsaId", ""] },
            phone: { $ifNull: ["$user.phone", ""] },
          },
          club: {
            _id: "$club._id",
            name: { $ifNull: ["$club.name", ""] },
          },
          district: {
            _id: "$district._id",
            name: { $ifNull: ["$district.name", ""] },
          },
          ageGroup: { $ifNull: ["$ageGroup", ""] },
          skaterApply: { $toBool: "$skaterApply" },
          clubAllow: { $toBool: "$clubAllow" },
          districtAllow: { $toBool: "$districtAllow" },
          stateAllow: { $toBool: "$stateAllow" },
          paymentStatus: { $ifNull: ["$paymentStatus", "pending"] },
          createdAt: 1,
          updatedAt: 1,
        },
      };

  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: pageLimit }, projectStage],
        totalCount: [{ $count: "count" }],
      },
    },
    {
      $project: {
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
      },
    }
  );

  const [result] = await EventParticipant.aggregate(pipeline);
  const total = result?.total ?? 0;
  const rawData = Array.isArray(result?.data) ? result.data : [];
  const data = await attachDocumentLinksToCertificationApplications(
    rawData,
    isStateCompactView
  );

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit),
    },
  };
};

export const approveCertificationByRoleRepository = async (reqUser, participantId) => {
  if (!mongoose.Types.ObjectId.isValid(String(participantId || ""))) {
    return null;
  }

  const role = String(reqUser?.role || "").trim().toLowerCase();
  const participant = await EventParticipant.findById(participantId)
    .select("userId eventId skaterApply clubAllow districtAllow stateAllow")
    .populate({ path: "eventId", select: "header" })
    .lean();

  if (!participant) {
    return null;
  }

  const skaterProfile = await Skater.findById(participant.userId).select("club").lean();
  if (!skaterProfile?.club) {
    throw new AppError("Skater club not found", 404);
  }

  const club = await Club.findById(skaterProfile.club).select("district").lean();
  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const eventName = participant.eventId?.header || "";
  const update = {};

  if (role === "club") {
    const resolvedClubId = await resolveClubIdForClubAuthUser(reqUser._id);
    if (String(skaterProfile.club) !== String(resolvedClubId)) {
      throw new AppError("Forbidden", 403);
    }
    if (!participant.skaterApply) {
      throw new AppError("Skater has not applied for certification", 400);
    }
    update.clubAllow = true;
  } else if (role === "district") {
    const districtUser = await BaseAuth.findById(reqUser._id).select("district").lean();
    const districtId = districtUser?.district || reqUser._id;
    if (String(club.district || "") !== String(districtId)) {
      throw new AppError("Forbidden", 403);
    }
    if (!participant.clubAllow) {
      throw new AppError("Club approval is pending", 400);
    }
    update.districtAllow = true;
  } else if (role === "state" || role === "admin") {
    if (!participant.districtAllow) {
      throw new AppError("District approval is pending", 400);
    }
    update.stateAllow = true;
  } else {
    throw new AppError("Forbidden", 403);
  }

  const actor = await resolveCertificationActorDisplay(reqUser, role);

  const updated = await EventParticipant.findByIdAndUpdate(
    participantId,
    { $set: update },
    { new: true }
  )
    .select("_id userId eventId skaterApply clubAllow districtAllow stateAllow updatedAt")
    .lean();

  if (!updated) {
    return null;
  }

  const approvalMeta = buildCertificationApprovalMeta(role, eventName, actor.actorName);

  if (participant.userId) {
    const eventIdStr = String(
      updated.eventId || participant.eventId?._id || participant.eventId || ""
    );

    if (role === "state" || role === "admin") {
      await notifySkaterCertificationApproved({
        receiverId: participant.userId,
        sentBy: reqUser._id,
        role,
        eventName,
        actorName: actor.actorName,
        participantId,
        eventId: eventIdStr,
      });
    } else {
      await sendNotification({
        receiverId: participant.userId,
        title: approvalMeta.title,
        body: approvalMeta.body,
        notificationType: "approval",
        sentBy: reqUser._id,
        data: {
          type: "certification_approved",
          code: approvalMeta.code,
          approvedByRole: actor.actorRole,
          approvedByName: actor.actorName,
          participantId: String(participantId),
          eventId: eventIdStr,
          eventName,
        },
      });
    }
  }

  return {
    ...updated,
    approvalCode: approvalMeta.code,
    approvedByRole: actor.actorRole,
    approvedByName: actor.actorName,
  };
};

const CERT_APPROVAL_CODES = {
  club: "APPROVED_BY_CLUB",
  district: "APPROVED_BY_DISTRICT",
  state: "APPROVED_BY_STATE",
  admin: "APPROVED_BY_ADMIN",
};

const CERT_REJECTION_CODES = {
  club: "REJECTED_BY_CLUB",
  district: "REJECTED_BY_DISTRICT",
  state: "REJECTED_BY_STATE",
  admin: "REJECTED_BY_ADMIN",
};

const resolveCertificationActorDisplay = async (reqUser, role) => {
  if (role === "club") {
    const resolvedClubId = await resolveClubIdForClubAuthUser(reqUser._id);
    const club = await Club.findById(resolvedClubId).select("name").lean();
    return {
      actorName: club?.name || "Club",
      actorRole: "Club",
    };
  }

  if (role === "district") {
    const districtUser = await BaseAuth.findById(reqUser._id)
      .select("district fullName")
      .lean();
    const districtId = districtUser?.district || reqUser._id;
    const district = await District.findById(districtId).select("name").lean();
    return {
      actorName: district?.name || districtUser?.fullName || "District",
      actorRole: "District",
    };
  }

  const stateUser = await BaseAuth.findById(reqUser._id).select("state fullName").lean();
  const stateId = stateUser?.state || reqUser._id;
  const stateDoc = await State.findById(stateId).select("name").lean();

  if (role === "admin") {
    return {
      actorName: stateDoc?.name || stateUser?.fullName || "Admin",
      actorRole: "Admin",
    };
  }

  return {
    actorName: stateDoc?.name || stateUser?.fullName || "State",
    actorRole: "State",
  };
};

const buildCertificationApprovalMeta = (role, eventName, actorName) => {
  const eventLabel = eventName?.trim() || "your event";
  const byLabel = actorName?.trim() || "the reviewer";

  if (role === "club") {
    return {
      code: CERT_APPROVAL_CODES.club,
      title: "Certification Approved by Club",
      body: `Your certification application for "${eventLabel}" was approved by ${byLabel}. It is now pending district review.`,
    };
  }
  if (role === "district") {
    return {
      code: CERT_APPROVAL_CODES.district,
      title: "Certification Approved by District",
      body: `Your certification application for "${eventLabel}" was approved by ${byLabel}. It is now pending state review.`,
    };
  }
  if (role === "admin") {
    return {
      code: CERT_APPROVAL_CODES.admin,
      title: "Certification Fully Approved",
      body: `Your certification application for "${eventLabel}" was fully approved by ${byLabel}. Congratulations!`,
    };
  }
  return {
    code: CERT_APPROVAL_CODES.state,
    title: "Certification Fully Approved",
    body: `Your certification application for "${eventLabel}" was fully approved by ${byLabel}. Congratulations!`,
  };
};

const buildCertificationRejectionMessage = (eventName, actorName) => {
  const eventLabel = eventName?.trim() || "your event";
  const byLabel = actorName?.trim() || "the reviewer";
  return `Your certification application for "${eventLabel}" was rejected by ${byLabel}. You may apply again when ready.`;
};

const buildCertificationRejectionUpdate = (role) => {
  if (role === "club") {
    return { skaterApply: false };
  }
  if (role === "district") {
    return { skaterApply: false, clubAllow: false };
  }
  if (role === "state" || role === "admin") {
    return {
      skaterApply: false,
      clubAllow: false,
      districtAllow: false,
      stateAllow: false,
    };
  }
  return null;
};

export const rejectCertificationByRoleRepository = async (reqUser, participantId) => {
  if (!mongoose.Types.ObjectId.isValid(String(participantId || ""))) {
    return null;
  }

  const role = String(reqUser?.role || "").trim().toLowerCase();
  const rejectionUpdate = buildCertificationRejectionUpdate(role);
  if (!rejectionUpdate) {
    throw new AppError("Forbidden", 403);
  }

  const participant = await EventParticipant.findById(participantId)
    .select("userId eventId skaterApply clubAllow districtAllow stateAllow")
    .populate({ path: "eventId", select: "header" })
    .lean();

  if (!participant) {
    return null;
  }

  const skaterProfile = await Skater.findById(participant.userId).select("club").lean();
  if (!skaterProfile?.club) {
    throw new AppError("Skater club not found", 404);
  }

  const club = await Club.findById(skaterProfile.club).select("district").lean();
  if (!club) {
    throw new AppError("Club not found", 404);
  }

  if (role === "club") {
    const resolvedClubId = await resolveClubIdForClubAuthUser(reqUser._id);
    if (String(skaterProfile.club) !== String(resolvedClubId)) {
      throw new AppError("Forbidden", 403);
    }
    if (!participant.skaterApply) {
      throw new AppError("Skater has not applied for certification", 400);
    }
  } else if (role === "district") {
    const districtUser = await BaseAuth.findById(reqUser._id).select("district").lean();
    const districtId = districtUser?.district || reqUser._id;
    if (String(club.district || "") !== String(districtId)) {
      throw new AppError("Forbidden", 403);
    }
    if (!participant.skaterApply || !participant.clubAllow) {
      throw new AppError("Club approval is pending", 400);
    }
  } else if (role === "state" || role === "admin") {
    if (!participant.skaterApply || !participant.clubAllow || !participant.districtAllow) {
      throw new AppError("District approval is pending", 400);
    }
  }

  const actor = await resolveCertificationActorDisplay(reqUser, role);
  const eventName = participant.eventId?.header || "";
  const rejector = {
    rejectionCode: CERT_REJECTION_CODES[role] || CERT_REJECTION_CODES.admin,
    rejectedByName: actor.actorName,
    rejectedByRole: actor.actorRole,
  };

  const updated = await EventParticipant.findByIdAndUpdate(
    participantId,
    { $set: rejectionUpdate },
    { new: true }
  )
    .select("_id userId eventId skaterApply clubAllow districtAllow stateAllow updatedAt")
    .lean();

  if (!updated) {
    return null;
  }

  const skaterUserId = participant.userId;
  if (skaterUserId) {
    await sendNotification({
      receiverId: skaterUserId,
      title: "Certification Rejected",
      body: buildCertificationRejectionMessage(eventName, rejector.rejectedByName),
      notificationType: "approval",
      sentBy: reqUser._id,
      data: {
        type: "certification_rejected",
        code: rejector.rejectionCode,
        rejectedByRole: rejector.rejectedByRole,
        rejectedByName: rejector.rejectedByName,
        participantId: String(participantId),
        eventId: String(participant.eventId?._id || participant.eventId || ""),
        eventName,
      },
    });
  }

  return {
    ...updated,
    rejectionCode: rejector.rejectionCode,
    rejectedByRole: rejector.rejectedByRole,
    rejectedByName: rejector.rejectedByName,
  };
};

export const createRegisterFormRepository = async (payload) => {
  return await EventParticipant.create(payload);
};

export const listEventSkatersByEventIdRepository = async (
  eventId,
  { page, limit, search, ageGroup, categoryName, categoriesId, clubId }
) => {
  const oid = new mongoose.Types.ObjectId(eventId);
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const usersCol = BaseAuth.collection.name;
  const skatersCol = Skater.collection.name;

  const initialMatch = { eventId: oid };
  const ageTerm = typeof ageGroup === "string" ? ageGroup.trim() : "";
  if (ageTerm) {
    initialMatch.ageGroup = ageTerm;
  }

  if (categoriesId && mongoose.Types.ObjectId.isValid(String(categoriesId))) {
    initialMatch.categoriesId = new mongoose.Types.ObjectId(categoriesId);
  }

  const categoryTermRaw = typeof categoryName === "string" ? categoryName.trim() : "";
  if (categoryTermRaw) {
    const disqualifiedTagMatch = categoryTermRaw.match(/^(.*)\+\s*d$/i);
    if (disqualifiedTagMatch) {
      const categoryLabel = disqualifiedTagMatch[1].trim();
      if (categoryLabel) {
        initialMatch.categories = {
          $elemMatch: {
            name: categoryLabel,
            isDisqualified: true,
          },
        };
      }
    } else {
      initialMatch.categories = {
        $elemMatch: {
          name: categoryTermRaw,
        },
      };
    }
  }

  const pipeline = [{ $match: initialMatch }];
  pipeline.push(
    {
      $lookup: {
        from: usersCol,
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
  );

  const term = typeof search === "string" ? search.trim() : "";
  if (term) {
    const rx = new RegExp(escapeRegex(term), "i");
    pipeline.push({
      $match: {
        $or: [
          { "user.fullName": rx },
          { "user.phone": rx },
          { "user.email": rx },
          { "user.krsaId": rx },
          { name: rx },
        ],
      },
    });
  }

  if (clubId && mongoose.Types.ObjectId.isValid(String(clubId))) {
    const clubOid = new mongoose.Types.ObjectId(clubId);
    pipeline.push(
      {
        $lookup: {
          from: skatersCol,
          localField: "userId",
          foreignField: "_id",
          as: "skaterProfile",
        },
      },
      { $unwind: { path: "$skaterProfile", preserveNullAndEmptyArrays: false } },
      { $match: { "skaterProfile.club": clubOid } }
    );
  }

  pipeline.push({
    $facet: {
      totalCount: [{ $count: "count" }],
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: pageLimit },
        {
          $project: {
            _id: 0,
            registrationId: "$_id",
            userId: 1,
            participantName: "$name",
            ageGroup: 1,
            paymentStatus: 1,
            categories: {
              $map: {
                input: { $ifNull: ["$categories", []] },
                as: "category",
                in: {
                  name: "$$category.name",
                  timeTaken: "$$category.timeTaken",
                  rank: "$$category.rank",
                  isDisqualified: "$$category.isDisqualified",
                  remarks: "$$category.remarks",
                  _id: "$$category._id",
                  attendanceStatus: {
                    $ifNull: ["$$category.attendanceStatus", "pending"],
                  },
                },
              },
            },
            registeredAt: "$createdAt",
            fullName: "$user.fullName",
            phone: "$user.phone",
            email: "$user.email",
            profile: "$user.profile",
            krsaId: "$user.krsaId",
          },
        },
      ],
    },
  });

  const [agg] = await EventParticipant.aggregate(pipeline);
  const total = agg?.totalCount?.[0]?.count ?? 0;
  const data = Array.isArray(agg?.data) ? agg.data : [];

  return {
    data,
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
  };
};

export const listCompetitionCategoryRankingsRepository = async (
  eventId,
  { ageGroup, categoryName, categoriesId, clubId }
) => {
  const categoryTermRaw =
    typeof categoryName === "string" ? categoryName.trim() : "";
  if (!categoryTermRaw) {
    return { results: [], topThree: [] };
  }

  const oid = new mongoose.Types.ObjectId(eventId);
  const initialMatch = { eventId: oid };

  const ageTerm = typeof ageGroup === "string" ? ageGroup.trim() : "";
  if (ageTerm) {
    initialMatch.ageGroup = ageTerm;
  }

  if (categoriesId && mongoose.Types.ObjectId.isValid(String(categoriesId))) {
    initialMatch.categoriesId = new mongoose.Types.ObjectId(categoriesId);
  }

  const disqualifiedTagMatch = categoryTermRaw.match(/^(.*)\+\s*d$/i);
  const categoryLabel = disqualifiedTagMatch
    ? disqualifiedTagMatch[1].trim()
    : categoryTermRaw;

  if (categoryLabel) {
    initialMatch.categories = {
      $elemMatch: disqualifiedTagMatch
        ? { name: categoryLabel, isDisqualified: true }
        : { name: categoryLabel },
    };
  }

  let participants = await EventParticipant.find(initialMatch)
    .select("name userId categories")
    .populate("userId", "fullName krsaId")
    .lean();

  if (clubId && mongoose.Types.ObjectId.isValid(String(clubId))) {
    const clubOid = new mongoose.Types.ObjectId(clubId);
    const userIds = participants
      .map((row) => row.userId?._id || row.userId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

    if (userIds.length === 0) {
      return { results: [], topThree: [] };
    }

    const skatersInClub = await Skater.find({
      _id: { $in: userIds },
      club: clubOid,
    })
      .select("_id")
      .lean();

    const allowedIds = new Set(skatersInClub.map((row) => String(row._id)));
    participants = participants.filter((row) =>
      allowedIds.has(String(row.userId?._id || row.userId))
    );
  }

  const results = [];

  for (const participant of participants) {
    const category = (participant.categories || []).find(
      (row) => String(row?.name || "").trim() === categoryLabel
    );
    if (!category) continue;

    results.push({
      registrationId: participant._id,
      userId: participant.userId?._id || participant.userId || null,
      participantName:
        participant.name || participant.userId?.fullName || "",
      krsaId: participant.userId?.krsaId || "",
      timeTaken: category.timeTaken ?? null,
      isDisqualified: Boolean(category.isDisqualified),
    });
  }

  return assignCompetitionRanks(results);
};

const buildParticipantCompetitionGroupKey = (
  eventId,
  ageGroup,
  categoriesId,
  categoryName
) =>
  `${String(eventId)}::${String(ageGroup || "").trim()}::${String(categoriesId || "")}::${String(categoryName || "").trim()}`;

/**
 * goldMedals / silverMedals for skater profile:
 * rank 1 = fastest time, rank 2 = 2nd fastest in each
 * (eventId + ageGroup + categoriesId + category.name) group.
 */
export const countSkaterParticipantMedalStatsRepository = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return { goldMedals: 0, silverMedals: 0 };
  }

  const skaterUserId = new mongoose.Types.ObjectId(String(userId));
  const skaterKey = String(userId);

  const myParticipations = await EventParticipant.find({ userId: skaterUserId })
    .select("eventId")
    .lean();

  if (!myParticipations.length) {
    return { goldMedals: 0, silverMedals: 0 };
  }

  const eventIds = [
    ...new Set(myParticipations.map((row) => String(row.eventId))),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const participants = await EventParticipant.find({
    eventId: { $in: eventIds },
  })
    .select("eventId ageGroup categoriesId userId categories")
    .lean();

  const grouped = new Map();

  for (const participant of participants) {
    const ageGroup = String(participant.ageGroup || "").trim();
    const categoriesId = participant.categoriesId;

    for (const category of participant.categories || []) {
      const categoryName = String(category?.name || "").trim();
      if (!categoryName) continue;

      const key = buildParticipantCompetitionGroupKey(
        participant.eventId,
        ageGroup,
        categoriesId,
        categoryName
      );

      if (!grouped.has(key)) {
        grouped.set(key, { results: [] });
      }

      grouped.get(key).results.push({
        registrationId: participant._id,
        userId: participant.userId?._id || participant.userId || null,
        timeTaken: category.timeTaken ?? null,
        isDisqualified: Boolean(category.isDisqualified),
      });
    }
  }

  let goldMedals = 0;
  let silverMedals = 0;

  for (const group of grouped.values()) {
    const { results: ranked } = assignCompetitionRanks(group.results);
    const mine = ranked.find((row) => String(row.userId) === skaterKey);
    if (!mine?.rank) continue;
    if (mine.rank === 1) goldMedals += 1;
    if (mine.rank === 2) silverMedals += 1;
  }

  return { goldMedals, silverMedals };
};

export const recalculateAndPersistCategoryRanksRepository = async ({
  eventId,
  categoriesId,
  ageGroup,
  categoryName,
}) => {
  const categoryLabel = String(categoryName || "").trim();
  if (!categoryLabel) return;

  const { results } = await listCompetitionCategoryRankingsRepository(eventId, {
    ageGroup,
    categoryName: categoryLabel,
    categoriesId,
    clubId: null,
  });

  const rankByRegistrationId = new Map(
    results.map((row) => [String(row.registrationId), row.rank])
  );

  const eventOid = new mongoose.Types.ObjectId(eventId);
  const match = {
    eventId: eventOid,
    ageGroup: typeof ageGroup === "string" ? ageGroup.trim() : ageGroup,
    categories: { $elemMatch: { name: categoryLabel } },
  };

  if (categoriesId && mongoose.Types.ObjectId.isValid(String(categoriesId))) {
    match.categoriesId = new mongoose.Types.ObjectId(categoriesId);
  }

  const participants = await EventParticipant.find(match);

  for (const participant of participants) {
    const rank = rankByRegistrationId.get(String(participant._id)) ?? null;
    let changed = false;

    for (const category of participant.categories) {
      if (String(category.name || "").trim() !== categoryLabel) continue;
      if (category.rank !== rank) {
        category.rank = rank;
        changed = true;
      }
    }

    if (changed) {
      participant.markModified("categories");
      await participant.save();
    }
  }
};

export const listEventSkatersBasicByEventIdRepository = async (eventId) => {
  const participants = await EventParticipant.find({
    eventId: new mongoose.Types.ObjectId(eventId),
  })
    .select("name userId")
    .populate("userId", "fullName krsaId phone email")
    .lean();

  const uniqueSkaters = new Map();
  for (const participant of participants) {
    const dedupeKey =
      String(participant.userId?._id || "").trim() ||
      String(participant.userId?.krsaId || "").trim() ||
      String(participant.userId?.email || "").trim() ||
      String(participant.userId?.phone || "").trim() ||
      String(participant.name || "").trim();

    if (!dedupeKey || uniqueSkaters.has(dedupeKey)) {
      continue;
    }

    uniqueSkaters.set(dedupeKey, {
      name: participant.name || participant.userId?.fullName || "",
      krsaId: participant.userId?.krsaId || "",
      phone: participant.userId?.phone || "",
      email: participant.userId?.email || "",
    });
  }

  const skaters = Array.from(uniqueSkaters.values());

  return {
    skaterCount: skaters.length,
    skaters,
  };
};

export const getStateEventResultsRepository = async (
  eventId,
  { ageGroup, categoryName }
) => {
  const participants = await EventParticipant.find({
    eventId: new mongoose.Types.ObjectId(eventId),
  })
    .select("name ageGroup categories userId")
    .populate("userId", "fullName phone email krsaId")
    .lean();

  const ageGroupTerm = typeof ageGroup === "string" ? ageGroup.trim() : "";
  const categoryTermRaw =
    typeof categoryName === "string" ? categoryName.trim() : "";

  let categoryFilterName = "";
  let categoryFilterIsDisqualified = null;
  if (categoryTermRaw) {
    const disqualifiedTagMatch = categoryTermRaw.match(/^(.*)\+\s*d$/i);
    if (disqualifiedTagMatch) {
      categoryFilterName = disqualifiedTagMatch[1].trim();
      categoryFilterIsDisqualified = true;
    } else {
      categoryFilterName = categoryTermRaw;
    }
  }

  const grouped = new Map();

  for (const participant of participants) {
    if (ageGroupTerm && participant.ageGroup !== ageGroupTerm) {
      continue;
    }

    for (const category of participant.categories || []) {
      const categoryNameValue = String(category?.name || "").trim();
      if (!categoryNameValue) continue;

      if (categoryFilterName && categoryNameValue !== categoryFilterName) {
        continue;
      }
      if (
        categoryFilterIsDisqualified !== null &&
        Boolean(category.isDisqualified) !== categoryFilterIsDisqualified
      ) {
        continue;
      }

      const key = `${participant.ageGroup}::${categoryNameValue}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ageGroup: participant.ageGroup,
          categoryName: categoryNameValue,
          results: [],
        });
      }

      grouped.get(key).results.push({
        registrationId: participant._id,
        userId: participant.userId?._id || participant.userId || null,
        participantName:
          participant.name || participant.userId?.fullName || "",
        fullName: participant.userId?.fullName || "",
        krsaId: participant.userId?.krsaId || "",
        phone: participant.userId?.phone || "",
        email: participant.userId?.email || "",
        timeTaken: category.timeTaken ?? null,
        isDisqualified: Boolean(category.isDisqualified),
        remarks: category.remarks || "",
        attendanceStatus: category.attendanceStatus || "pending",
      });
    }
  }

  const groups = Array.from(grouped.values()).map((group) => {
    const { results: ranked, topThree } = assignCompetitionRanks(group.results);

    return {
      ...group,
      totalSkaters: ranked.length,
      topThree,
      results: ranked,
    };
  });

  groups.sort((a, b) => {
    if (a.ageGroup !== b.ageGroup) {
      return a.ageGroup.localeCompare(b.ageGroup);
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  return {
    groups,
    totalGroups: groups.length,
  };
};

export const findEventParticipantForCompetitionUpdate = async ({
  eventId,
  registrationId,
  skaterId,
  categoriesId,
  ageGroup,
  categoryName,
}) => {
  const eventOid = new mongoose.Types.ObjectId(eventId);
  const query = {
    eventId: eventOid,
    categoriesId: new mongoose.Types.ObjectId(categoriesId),
    ageGroup: typeof ageGroup === "string" ? ageGroup.trim() : ageGroup,
    categories: {
      $elemMatch: {
        name: typeof categoryName === "string" ? categoryName.trim() : categoryName,
      },
    },
  };

  if (registrationId) {
    query._id = new mongoose.Types.ObjectId(registrationId);
  } else if (skaterId) {
    query.userId = new mongoose.Types.ObjectId(skaterId);
  } else {
    return null;
  }

  return EventParticipant.findOne(query).select("_id userId name ageGroup categories").lean();
};

export const updateEventParticipantTimingBySkaterRepository = async (
  { skaterId, registrationId },
  eventId,
  payload
) => {
  let participant = null;

  if (registrationId) {
    participant = await EventParticipant.findOne({
      _id: new mongoose.Types.ObjectId(registrationId),
      eventId: new mongoose.Types.ObjectId(eventId),
    });
  } else if (skaterId) {
    participant = await EventParticipant.findOne({
      userId: new mongoose.Types.ObjectId(skaterId),
      eventId: new mongoose.Types.ObjectId(eventId),
    });
  }

  if (!participant) return null;

  if (typeof payload.status === "string") {
    const normalizedStatus = normalizeAttendanceStatus(payload.status);
    participant.categories = participant.categories.map((category) => ({
      ...category.toObject(),
      attendanceStatus: normalizedStatus,
    }));
  }

  const forceDisqualified = payload.isDisqualified;

  if (Array.isArray(payload.categories) && payload.categories.length > 0) {
    const inputByName = new Map(
      payload.categories.map((category) => [String(category.name || "").trim(), category])
    );

    const unknownCategories = [...inputByName.keys()].filter((name) => {
      if (!name) return true;
      return !participant.categories.some(
        (registeredCategory) => String(registeredCategory.name || "").trim() === name
      );
    });

    if (unknownCategories.length > 0) {
      throw new AppError(
        `Invalid categories for this skater: ${unknownCategories.join(", ")}`,
        400
      );
    }

    let categoriesTouched = false;

    for (const category of participant.categories) {
      const incoming = inputByName.get(String(category.name || "").trim());
      if (!incoming) {
        continue;
      }

      categoriesTouched = true;

      if (incoming.timeTaken !== undefined) {
        category.timeTaken = incoming.timeTaken;
        category.attendanceStatus = resolveAttendanceFromTimeTaken(
          incoming.timeTaken,
          incoming.attendanceStatus,
          category.attendanceStatus
        );
      } else if (incoming.attendanceStatus !== undefined) {
        category.attendanceStatus = normalizeAttendanceStatus(incoming.attendanceStatus);
      }

      if (incoming.rank !== undefined) {
        category.rank = incoming.rank;
      }

      if (incoming.isDisqualified !== undefined) {
        category.isDisqualified = incoming.isDisqualified;
      } else if (typeof forceDisqualified === "boolean") {
        category.isDisqualified = forceDisqualified;
      }

      if (incoming.remarks !== undefined) {
        category.remarks = incoming.remarks;
      }
    }

    if (categoriesTouched) {
      participant.markModified("categories");
    }
  } else if (typeof forceDisqualified === "boolean") {
    participant.categories = participant.categories.map((category) => ({
      ...category.toObject(),
      isDisqualified: forceDisqualified,
      attendanceStatus:
        category.attendanceStatus ||
        "pending",
    }));
  }

  await participant.save();

  return participant.toObject();
};


export const clubRelatedEventDisplayRepositories = async (
  authUserId,
  { page, limit }
) => {
  const resolvedClubId = await resolveClubIdForClubAuthUser(authUserId);
  const clubRow = await Club.findById(resolvedClubId).select("district").lean();
  if (!clubRow) {
    throw new AppError("Club not found", 404);
  }
  const districtId = clubRow.district ?? null;
  const query = {
    $and: [
      {
        $or: [
          {
            $and: [
              {
                $or: buildSkaterVisibleEventsOrClause({
                  clubId: resolvedClubId,
                  districtId,
                }),
              },
              approvedPublicEventFilter(),
            ],
          },
          {
            eventType: "Club",
            eventFor: resolvedClubId,
            adminApprovalStatus: {
              $in: [EVENT_ADMIN_APPROVAL.PENDING, EVENT_ADMIN_APPROVAL.REJECTED],
            },
            deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
          },
        ],
      },
      registrationStillOpenFilter(),
    ],
  };

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page,limit);

  const events = await Event.find(query)
    .select(EVENT_CARD_LIST_PROJECTION)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  const enriched = await enrichLeanEventsSkatingCategoryNames(events);
  const data = enriched.map(toEventCardListItem);

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: calcTotalPages(total, pageLimit)
    }
  };
};

export const createClubEventRepositories = async (clubAuthUserId, data) => {
  const resolvedClubId = await resolveClubIdForClubAuthUser(clubAuthUserId);

  const payload = {
    ...data,
    eventType: "Club",
    eventFor: new mongoose.Types.ObjectId(resolvedClubId),
    adminApprovalStatus: EVENT_ADMIN_APPROVAL.PENDING,
  };

  const event = await Event.create(payload);

  const club = await Club.findById(resolvedClubId).select("name").lean();
  notifyStateLevelOnEventPendingApproval({
    event,
    eventType: "Club",
    orgName: club?.name || "A club",
    sentBy: clubAuthUserId,
  }).catch((err) => {
    console.error("Club event pending-approval notification failed:", err?.message || err);
  });

  return event;
};

export const districtRelatedEventDisplayRepositories = async (districtUserId, { page, limit }) => {
  const districtUser = await BaseAuth.findById(districtUserId).select("district").lean();
  const districtId = districtUser?.district || districtUserId;

  const query = {
    eventType: "District",
    eventFor: new mongoose.Types.ObjectId(districtId),
    deleteApprovalStatus: { $ne: EVENT_DELETE_APPROVAL.PENDING },
  };

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const events = await Event.find(query)
    .select(EVENT_CARD_LIST_PROJECTION)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  const enriched = await enrichLeanEventsSkatingCategoryNames(events);
  const data = enriched.map(toEventCardListItem);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data,
  };
};

export const createDistrictEventRepositories = async (districtAuthUserId, data) => {
  const districtId = await resolveDistrictOwnerIdRepositories({ _id: districtAuthUserId });

  const payload = {
    ...data,
    eventType: "District",
    eventFor: new mongoose.Types.ObjectId(String(districtId)),
    adminApprovalStatus: EVENT_ADMIN_APPROVAL.PENDING,
  };

  const event = await Event.create(payload);

  const district = await District.findById(districtId).select("name").lean();
  notifyStateLevelOnEventPendingApproval({
    event,
    eventType: "District",
    orgName: district?.name || "A district",
    sentBy: districtAuthUserId,
  }).catch((err) => {
    console.error(
      "District event pending-approval notification failed:",
      err?.message || err
    );
  });

  return event;
};

/**
 * For each lean event, replace `skatingEventCategories` id list with `{ _id, typeName }[]` (same order).
 */
export const enrichLeanEventsSkatingCategoryNames = async (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }
  const idSet = new Set();
  for (const ev of events) {
    for (const id of ev.skatingEventCategories || []) {
      const s = String(id);
      if (mongoose.Types.ObjectId.isValid(s)) idSet.add(s);
    }
  }
  if (idSet.size === 0) {
    return events.map((ev) => ({ ...ev, skatingEventCategories: [] }));
  }
  const objectIds = [...idSet].map((id) => new mongoose.Types.ObjectId(id));
  const docs = await SkatingEventCategory.find({ _id: { $in: objectIds } })
    .select("_id typeName")
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  return events.map((ev) => ({
    ...ev,
    skatingEventCategories: (ev.skatingEventCategories || []).map((id) => {
      const key = String(id);
      const doc = byId.get(key);
      return doc
        ? { _id: doc._id, typeName: doc.typeName ?? "" }
        : { _id: id, typeName: null };
    }),
  }));
};

/** Public fields for event list cards (`GET .../v1/state`, `GET .../v1/district`, `GET .../v1/club`, `GET .../v1/user-all-events`, `GET .../v1/latest-event`). */
const EVENT_CARD_LIST_PROJECTION =
  "_id header about registerStartDate registerEndDate eventStartDate eventEndDate eventStartTime eventEndTime entryFee colorOne colorTwo textColor skatingEventCategories status address eventType adminApprovalStatus deleteApprovalStatus";

const toValidDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Last moment registration is open (end of registerEndDate calendar day). */
const getRegistrationCloseMoment = (registerEndDate) => {
  const end = toValidDate(registerEndDate);
  if (!end) return null;
  end.setHours(23, 59, 59, 999);
  return end;
};

/** Display only when registerEndDate has not passed (registerEndDate < now → hidden). */
const isRegistrationOpen = (registerEndDate, referenceDate = new Date()) => {
  const closesAt = getRegistrationCloseMoment(registerEndDate);
  if (!closesAt) return false;
  return closesAt >= referenceDate;
};

/** Derive status from schedule: completed after end, active after start, else coming_soon. */
export const resolveEventStatusByDates = (event) => {
  const storedStatus = event?.status ?? "coming_soon";
  if (storedStatus === "cancelled") {
    return "cancelled";
  }

  const now = new Date();
  const eventStartDate = toValidDate(event?.eventStartDate);
  const eventEndDate = toValidDate(event?.eventEndDate);

  if (eventEndDate && eventEndDate < now) {
    return "completed";
  }
  if (eventStartDate && eventStartDate < now) {
    return "active";
  }

  return "coming_soon";
};

const toEventCardListItem = (ev) => ({
  _id: ev._id,
  header: ev.header ?? "",
  about: ev.about ?? "",
  registerStartDate: ev.registerStartDate ?? null,
  registerEndDate: ev.registerEndDate ?? null,
  eventStartDate: ev.eventStartDate ?? null,
  eventEndDate: ev.eventEndDate ?? null,
  eventStartTime: ev.eventStartTime ?? "",
  eventEndTime: ev.eventEndTime ?? "",
  entryFee: ev.entryFee ?? "",
  colorOne: ev.colorOne ?? "#6A11CB",
  colorTwo: ev.colorTwo ?? "#2575FC",
  textColor: ev.textColor ?? "#FFFFFF",
  skatingEventCategories: ev.skatingEventCategories ?? [],
  status: resolveEventStatusByDates(ev),
  address: ev.address ?? "",
  eventType: ev.eventType ?? "",
  adminApprovalStatus: ev.adminApprovalStatus || EVENT_ADMIN_APPROVAL.APPROVED,
  deleteApprovalStatus: ev.deleteApprovalStatus || null,
});

const LIVE_EVENT_LIST_PROJECTION =
  "_id header eventStartDate eventEndDate colorOne colorTwo textColor skatingEventCategories";

/** Event is live when today falls between eventStartDate and eventEndDate (inclusive). */
const getLiveEventDateFilter = () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return {
    eventStartDate: { $lte: endOfToday },
    eventEndDate: { $gte: startOfToday },
  };
};

const toLiveEventListItem = (ev) => ({
  _id: ev._id,
  header: ev.header ?? "",
  eventStartDate: ev.eventStartDate ?? null,
  eventEndDate: ev.eventEndDate ?? null,
  colorOne: ev.colorOne ?? "#6A11CB",
  colorTwo: ev.colorTwo ?? "#2575FC",
  textColor: ev.textColor ?? "#FFFFFF",
  skatingEventCategories: (ev.skatingEventCategories || []).map((cat) => ({
    _id: cat._id,
    name: cat.typeName ?? "",
  })),
});

const buildLiveEventRoleFilter = async (role, userId) => {
  const normalized = String(role || "").trim().toLowerCase();

  if (normalized === "state") {
    return { eventType: "State" };
  }

  if (normalized === "district") {
    const districtUser = await BaseAuth.findById(userId).select("district").lean();
    const districtId = districtUser?.district || userId;
    return {
      eventType: "District",
      eventFor: new mongoose.Types.ObjectId(districtId),
    };
  }

  if (normalized === "club") {
    const resolvedClubId = await resolveClubIdForClubAuthUser(userId);
    return {
      eventType: "Club",
      eventFor: new mongoose.Types.ObjectId(resolvedClubId),
    };
  }

  if (normalized === "admin") {
    return {};
  }

  return null;
};

export const getLiveEventsRepository = async (role, userId, { page, limit }) => {
  const roleFilter = await buildLiveEventRoleFilter(role, userId);
  if (roleFilter === null) {
    return {
      total: 0,
      page: 1,
      limit: paginate(page, limit).limit,
      totalPages: 0,
      data: [],
    };
  }

  const query = {
    $and: [
      { ...getLiveEventDateFilter(), ...roleFilter },
      approvedPublicEventFilter(),
    ],
  };

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const [total, events] = await Promise.all([
    Event.countDocuments(query),
    Event.find(query)
      .select(LIVE_EVENT_LIST_PROJECTION)
      .sort({ eventStartDate: 1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),
  ]);

  const enriched = await enrichLeanEventsSkatingCategoryNames(events);
  const data = enriched.map(toLiveEventListItem);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data,
  };
};

export const stateRelatedEventDisplayRepositories = async (stateId, { page, limit, search }) => {
  const query = { eventType: "State" };
  if (stateId) {
    query.eventFor = new mongoose.Types.ObjectId(stateId);
  }
  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { header: searchRegex },
      { about: searchRegex },
      { address: searchRegex },
    ];
  }

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const events = await Event.find(query)
    .select(EVENT_CARD_LIST_PROJECTION)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  const enriched = await enrichLeanEventsSkatingCategoryNames(events);
  const data = enriched.map(toEventCardListItem);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data,
  };
};

export const createStateEventRepositories = async (stateId, data, creatorUserId, creatorRole) => {
  const approvalStatus = initialAdminApprovalStatus("State", creatorRole);
  const payload = {
    ...data,
    eventType: "State",
    eventFor: new mongoose.Types.ObjectId(stateId),
    adminApprovalStatus: approvalStatus,
  };

  const event = await Event.create(payload);

  const state = await State.findById(stateId).select("name").lean();
  const stateName = state?.name || "Karnataka";

  if (approvalStatus === EVENT_ADMIN_APPROVAL.PENDING) {
    notifyStateLevelOnEventPendingApproval({
      event,
      eventType: "State",
      orgName: stateName,
      sentBy: creatorUserId,
    }).catch((err) => {
      console.error("State event pending-approval notification failed:", err?.message || err);
    });
  } else if (state && creatorUserId) {
    notifyStateMembersOfNewEvent({
      creatorUserId,
      stateDocId: stateId,
      stateName,
      event,
    }).catch((err) => {
      console.error("State event notifications failed:", err?.message || err);
    });
  }

  return event;
};

const displaySingleEventRepository = async (id) => {
  const event = await Event.findById(id)
    .populate("eventFor", "name")
    .lean();

  if (event?.eventFor) {
    event.eventFor = event.eventFor.name; // ✅ convert to name only
  }

  return event;
};

/**
 * Event lean doc if the skater may see it (State / own district / own club), else null.
 * @param {string|null|undefined} select - optional mongoose `.select()` projection
 */
const fetchEventLeanIfSkaterAccessible = async (eventId, skaterUserId, select) => {
  const scope = await resolveSkaterEventScope(skaterUserId);
  if (!scope) {
    return null;
  }

  const { clubId, districtId } = scope;

  const rawId = String(eventId || "").trim();
  if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
    return null;
  }

  const baseSelect =
    "eventType eventFor adminApprovalStatus deleteApprovalStatus registerEndDate categoryFormat";
  const mergedSelect = select ? `${baseSelect} ${select}` : baseSelect;

  const event = await Event.findById(rawId).select(mergedSelect).lean();

  if (!event) {
    return null;
  }

  const [districtMemberIds, clubMemberIds] = await Promise.all([
    loadDistrictMemberIds(districtId),
    loadClubMemberIds(clubId),
  ]);

  if (event.eventType === "State") {
    // All state events (including admin-created) are visible to every skater.
  } else if (event.eventType === "District") {
    if (!skaterOwnsDistrictEvent(event, districtId, districtMemberIds)) {
      return null;
    }
  } else if (event.eventType === "Club") {
    if (!skaterOwnsClubEvent(event, clubId, clubMemberIds)) {
      return null;
    }
  } else {
    return null;
  }

  if (!isEventPubliclyVisible(event)) {
    return null;
  }

  return event;
};

/** Same as fetchEventLeanIfSkaterAccessible plus registration must still be open. */
const fetchEventLeanIfSkaterCanRegister = async (eventId, skaterUserId, select) => {
  const event = await fetchEventLeanIfSkaterAccessible(eventId, skaterUserId, select);
  if (!event) {
    return null;
  }
  if (!isRegistrationOpen(event.registerEndDate)) {
    return null;
  }
  return event;
};

/**
 * Skater-only event detail: same visibility as latest-event (all State events + District/Club for skater's district/club).
 * `name` is the organizer: State/District/Club document `name` (State defaults to schema default e.g. Karnataka).
 */
export const getSkaterEventFullDetailsDtoRepository = async (eventId, skaterUserId) => {
  const event = await fetchEventLeanIfSkaterAccessible(eventId, skaterUserId, null);
  if (!event) {
    return null;
  }

  const [enriched] = await enrichLeanEventsSkatingCategoryNames([event]);

  const name =
    event.eventType === "State"
      ? event.eventFor?.name || "Karnataka"
      : event.eventFor?.name || "";

  const paidRegistration = await EventParticipant.findOne({
    userId: skaterUserId,
    eventId: event._id,
    paymentStatus: "paid",
  })
    .select("_id")
    .lean();

  return {
    _id: event._id,
    header: event.header ?? "",
    registerStartDate: event.registerStartDate,
    registerEndDate: event.registerEndDate,
    eventStartDate: event.eventStartDate,
    eventEndDate: event.eventEndDate,
    eventStartTime: event.eventStartTime ?? "",
    eventEndTime: event.eventEndTime ?? "",
    about: event.about ?? "",
    address: event.address ?? "",
    eventType: event.eventType,
    name,
    status: resolveEventStatusByDates(event),
    entryFee: event.entryFee ?? "",
    colorOne: event.colorOne ?? "#6A11CB",
    colorTwo: event.colorTwo ?? "#2575FC",
    textColor: event.textColor ?? "#FFFFFF",
    skatingEventCategories: enriched.skatingEventCategories ?? [],
    isRegister: Boolean(paidRegistration),
  };
};

const toSkatingCategorySummary = (doc) =>
  doc
    ? { _id: doc._id, typeName: doc.typeName ?? "" }
    : null;

/**
 * Event form details: skater `category` as `{ _id, typeName }`; event `skatingEventCategories` full documents.
 */
export const getSkaterEventFormCategoryDetailsRepository = async (eventId, skaterUserId) => {
  const event = await fetchEventLeanIfSkaterCanRegister(
    eventId,
    skaterUserId,
    "skatingEventCategories header entryFee"
  );
  if (!event) {
    return null;
  }

  const skater =
    (await Skater.findById(skaterUserId)
      .select("fullName krsaId category phone countryCode")
      .lean()) ||
    (await BaseAuth.findById(skaterUserId)
      .select("fullName krsaId phone countryCode")
      .lean());

  const meta = {
    eventId: event._id,
    eventName: event.header ?? "",
    entryFee: event.entryFee ?? "",
    skaterName: skater?.fullName ?? "",
    krsaId: skater?.krsaId ?? "",
    phone: skater?.phone ?? "",
    countryCode: skater?.countryCode ?? "+91",
  };

  const orderedIds = (event.skatingEventCategories || [])
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const skaterCategoryId =
    skater?.category && mongoose.Types.ObjectId.isValid(String(skater.category))
      ? String(skater.category)
      : null;

  let skatingEventCategories = [];
  if (orderedIds.length > 0) {
    const objectIds = orderedIds.map((id) => new mongoose.Types.ObjectId(id));
    const docs = await SkatingEventCategory.find({ _id: { $in: objectIds } })
      .populate(CATEGORY_FORMULA_POPULATE)
      .lean();
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
    skatingEventCategories = resolveSkatingCategoriesForEvent(
      event,
      orderedIds.map((id) => byId.get(id)).filter(Boolean)
    );
  }

  let category = null;
  if (skaterCategoryId) {
    const fromEventList = skatingEventCategories.find(
      (doc) => String(doc._id) === skaterCategoryId
    );
    if (fromEventList) {
      category = toSkatingCategorySummary(fromEventList);
    } else {
      const skaterCat = await SkatingEventCategory.findById(skaterCategoryId)
        .select("_id typeName")
        .lean();
      const typeName = String(skaterCat?.typeName || "").trim();
      const peerOnEvent = typeName
        ? skatingEventCategories.find(
            (doc) =>
              String(doc?.typeName || "").trim().toLowerCase() === typeName.toLowerCase()
          )
        : null;
      category = peerOnEvent
        ? toSkatingCategorySummary(peerOnEvent)
        : toSkatingCategorySummary(skaterCat);
    }
  }

  return {
    ...meta,
    categoryFormat: event.categoryFormat ?? "standard",
    category,
    skatingEventCategories,
  };
};

/**
 * Full SkatingEventCategory documents for an event (`skatingEventCategories` order preserved).
 */
export const getEventSkatingEventCategoriesFullRepository = async (eventId) => {
  const event = await Event.findById(eventId)
    .select("header skatingEventCategories categoryFormat eventType eventFor")
    .lean();
  if (!event) {
    return null;
  }

  const orderedIds = (event.skatingEventCategories || [])
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  let skatingEventCategories = [];
  if (orderedIds.length > 0) {
    const objectIds = orderedIds.map((id) => new mongoose.Types.ObjectId(id));
    const docs = await SkatingEventCategory.find({ _id: { $in: objectIds } })
      .populate(CATEGORY_FORMULA_POPULATE)
      .lean();
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
    skatingEventCategories = resolveSkatingCategoriesForEvent(
      event,
      orderedIds.map((id) => byId.get(id)).filter(Boolean)
    );
  }

  return {
    eventId: event._id,
    eventName: event.header ?? "",
    eventType: event.eventType ?? "",
    categoryFormat: event.categoryFormat ?? "standard",
    skatingEventCategories,
  };
};

/** Event by id with `eventFor` populated (State / District / Club all expose `name`). */
export const getEventByIdPopulatingEventForNameRepository = async (eventId) => {
  return Event.findById(eventId).populate("eventFor", "name").lean();
};

/** Same fetch as display single, but keeps populated `eventFor` for authorization. */
export const getStateEventFullDetailsByIdRepository =
  getEventByIdPopulatingEventForNameRepository;

const display_latest_event_repositories = async (userId) => {
  const scope = await resolveSkaterEventScope(userId);
  if (!scope) {
    return null;
  }

  const { clubId, districtId } = scope;
  const [districtMemberIds, clubMemberIds] = await Promise.all([
    loadDistrictMemberIds(districtId),
    loadClubMemberIds(clubId),
  ]);

  const query = {
    $and: [
      {
        $or: buildSkaterVisibleEventsOrClause({
          clubId,
          districtId,
          districtMemberIds,
          clubMemberIds,
        }),
      },
      skaterListableEventsFilter(),
    ],
  };

  const event = await Event.findOne(query)
    .select(`${EVENT_CARD_LIST_PROJECTION} registerEndDate`)
    .sort({ registerEndDate: -1, createdAt: -1 })
    .lean();

  if (!event || !isRegistrationOpen(event.registerEndDate)) {
    return null;
  }

  const [enriched] = await enrichLeanEventsSkatingCategoryNames([event]);

  const paidRegistration = await EventParticipant.findOne({
    userId,
    eventId: event._id,
    paymentStatus: "paid",
  })
    .select("_id")
    .lean();

  return {
    ...toEventCardListItem(enriched),
    isRegister: Boolean(paidRegistration),
  };
};
const create_event_repositories = async (data) => {
  const event = await Event.create(data);
  console.log(event, "event details");
}

const edit_event_repositories = async (id, data) => {
  const event = await Event.findByIdAndUpdate(
    id,
    data,
    { new: true }
  );

  return event;
};

const delete_event_repositories = async (id) => {
  await Event.findByIdAndDelete(id);
};

export const approveEventByAdminRepository = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (!requiresAdminApprovalOnCreate(event.eventType)) {
    throw new AppError("This event type does not require approval", 400);
  }
  if (event.adminApprovalStatus === EVENT_ADMIN_APPROVAL.APPROVED) {
    throw new AppError("Event is already approved", 400);
  }

  const updated = await Event.findByIdAndUpdate(
    eventId,
    { $set: { adminApprovalStatus: EVENT_ADMIN_APPROVAL.APPROVED } },
    { new: true }
  ).lean();

  if (event.eventType === "Club") {
    const club = await Club.findById(event.eventFor).select("name").lean();
    if (club) {
      notifyClubSkatersOfNewEvent({
        clubAuthUserId: event.eventFor,
        clubDocId: event.eventFor,
        clubName: club.name || "Your club",
        event: updated,
      }).catch((err) => {
        console.error("Club event approval notification failed:", err?.message || err);
      });
    }
  }

  if (event.eventType === "District") {
    const district = await District.findById(event.eventFor).select("name").lean();
    if (district) {
      notifyDistrictMembersOfNewEvent({
        districtAuthUserId: event.eventFor,
        districtDocId: event.eventFor,
        districtName: district.name || "Your district",
        event: updated,
      }).catch((err) => {
        console.error("District event approval notification failed:", err?.message || err);
      });
    }
  }

  if (event.eventType === "State") {
    const state = await State.findById(event.eventFor).select("name").lean();
    notifyStateMembersOfNewEvent({
      creatorUserId: null,
      stateDocId: event.eventFor,
      stateName: state?.name || "Karnataka",
      event: updated,
    }).catch((err) => {
      console.error("State event approval notification failed:", err?.message || err);
    });
  }

  return updated;
};

export const rejectEventByAdminRepository = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (!requiresAdminApprovalOnCreate(event.eventType)) {
    throw new AppError("This event type does not require approval", 400);
  }

  return Event.findByIdAndUpdate(
    eventId,
    { $set: { adminApprovalStatus: EVENT_ADMIN_APPROVAL.REJECTED } },
    { new: true }
  ).lean();
};

export const requestEventDeleteRepository = async (eventId) => {
  const event = await Event.findById(eventId).select("eventType deleteApprovalStatus").lean();
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (!requiresAdminApprovalOnCreate(event.eventType)) {
    await delete_event_repositories(eventId);
    return { deleted: true, pendingDelete: false };
  }
  if (event.deleteApprovalStatus === EVENT_DELETE_APPROVAL.PENDING) {
    throw new AppError("Delete request is already pending admin approval", 400);
  }

  const registeredCount = await EventParticipant.countDocuments({ eventId });
  if (registeredCount > 0) {
    throw new AppError(
      "Cannot delete event: skaters are already registered for this event",
      400
    );
  }

  await Event.findByIdAndUpdate(eventId, {
    $set: { deleteApprovalStatus: EVENT_DELETE_APPROVAL.PENDING },
  });

  return { deleted: false, pendingDelete: true };
};

export const approveEventDeleteByAdminRepository = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (event.deleteApprovalStatus !== EVENT_DELETE_APPROVAL.PENDING) {
    throw new AppError("No pending delete request for this event", 400);
  }

  await delete_event_repositories(eventId);
  return { deleted: true };
};

export const rejectEventDeleteByAdminRepository = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (event.deleteApprovalStatus !== EVENT_DELETE_APPROVAL.PENDING) {
    throw new AppError("No pending delete request for this event", 400);
  }

  return Event.findByIdAndUpdate(
    eventId,
    { $unset: { deleteApprovalStatus: "" } },
    { new: true }
  ).lean();
};


const display_all_event_based_on_user_repositories = async (userId, { page, limit }) => {
  const scope = await resolveSkaterEventScope(userId);
  if (!scope) {
    throw new Error("User not found");
  }
  const { skaterCategory, clubId, districtId } = scope;

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const [districtMemberIds, clubMemberIds] = await Promise.all([
    loadDistrictMemberIds(districtId),
    loadClubMemberIds(clubId),
  ]);

  const andClauses = [
    {
      $or: buildSkaterVisibleEventsOrClause({
        clubId,
        districtId,
        districtMemberIds,
        clubMemberIds,
      }),
    },
    skaterListableEventsFilter(),
  ];

  const categoryClause = await buildSkaterCategoryMatchClause(skaterCategory);
  if (categoryClause) {
    andClauses.push(categoryClause);
  }

  let query = { $and: andClauses };

  let total = await Event.countDocuments(query);
  let events = await Event.find(query)
    .select(EVENT_CARD_LIST_PROJECTION)
    .sort({ eventStartDate: 1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  // If typeName/id mismatch blocked results, list approved open events in scope anyway.
  if (total === 0 && categoryClause) {
    const queryWithoutCategory = {
      $and: andClauses.filter((clause) => !clause.skatingEventCategories),
    };
    total = await Event.countDocuments(queryWithoutCategory);
    events = await Event.find(queryWithoutCategory)
      .select(EVENT_CARD_LIST_PROJECTION)
      .sort({ eventStartDate: 1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();
    query = queryWithoutCategory;
  }

  const enriched = await enrichLeanEventsSkatingCategoryNames(events);

  const paidEventIdSet = new Set();
  if (events.length > 0) {
    const paidParticipations = await EventParticipant.find({
      userId,
      eventId: { $in: events.map((e) => e._id) },
      paymentStatus: "paid",
    })
      .select("eventId")
      .lean();

    for (const participation of paidParticipations) {
      paidEventIdSet.add(String(participation.eventId));
    }
  }

  const data = enriched.map((ev) => ({
    ...toEventCardListItem(ev),
    isRegister: paidEventIdSet.has(String(ev._id)),
  }));
  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: calcTotalPages(total, pageLimit),
    data,
  };
};
export {
  displayAllEventRepository,
  displaySingleEventRepository,
  display_latest_event_repositories,
  create_event_repositories,
  edit_event_repositories,
  delete_event_repositories,
  display_all_event_based_on_user_repositories
};

