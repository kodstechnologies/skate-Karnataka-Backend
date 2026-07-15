import { EventParticipant } from "../event/eventParticipant.model.js";
import { Event } from "../event/event.model.js";
import { approvedPublicEventFilter } from "../event/eventApprovalPolicy.js";
import { getEventSkatingEventCategoriesFullRepository } from "../event/event.repositories.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";
import { sendNotification } from "../../util/firebase/sendNotification.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta, paginate } from "../../util/common/paginate.js";

/** Last moment registration is open (end of registerEndDate calendar day). */
const getRegistrationCloseMoment = (registerEndDate) => {
  if (!registerEndDate) {
    return null;
  }
  const end = new Date(registerEndDate);
  if (Number.isNaN(end.getTime())) {
    return null;
  }
  end.setHours(23, 59, 59, 999);
  return end;
};

/** Registration has closed (no extra 24h wait — job time is controlled by the scheduler). */
export const isRegistrationClosedForChestGeneration = (
  registerEndDate,
  referenceDate = new Date()
) => {
  const closesAt = getRegistrationCloseMoment(registerEndDate);
  if (!closesAt) {
    return false;
  }
  return closesAt < referenceDate;
};

/** Registered skaters eligible for chest numbers (paid or pending; not failed). */
const chestParticipantFilter = (eventId) => ({
  eventId,
  paymentStatus: { $in: ["paid", "pending"] },
});

const assessChestGenerationForEvent = async (eventId) => {
  console.log(`Assessing chest number generation for event ID: ${eventId}...`);
  const filter = chestParticipantFilter(eventId);
  console.log(`Counting participants with filter: ${JSON.stringify(filter)}...`);
  const participantCount = await EventParticipant.countDocuments(filter);
  console.log(`Participant count (paid/pending) for event ID ${eventId}: ${participantCount}`);
  const paidCount = await EventParticipant.countDocuments({
    eventId,
    paymentStatus: "paid",
  });
  const pendingCount = await EventParticipant.countDocuments({
    eventId,
    paymentStatus: "pending",
  });
  const chestCount = await SkaterChestNo.countDocuments({ eventId });

  if (!participantCount) {
    return {
      shouldRun: false,
      reason: "no_eligible_participants",
      participantCount,
      paidCount,
      pendingCount,
      chestCount,
    };
  }

  if (chestCount >= participantCount) {
    return {
      shouldRun: false,
      reason: "chest_numbers_already_complete",
      participantCount,
      paidCount,
      pendingCount,
      chestCount,
    };
  }

  return {
    shouldRun: true,
    reason: chestCount > 0 ? "regenerate_missing" : "first_generation",
    participantCount,
    paidCount,
    pendingCount,
    chestCount,
  };
};

/** Block competition reads until chest numbers are formally generated for the event. */
export const assertChestNumbersGeneratedForEvent = async (eventId) => {
  const assessment = await assessChestGenerationForEvent(eventId);

  if (assessment.reason === "no_eligible_participants") {
    return assessment;
  }

  if (assessment.chestCount < 1) {
    throw new AppError(
      "Chest numbers have not been generated yet. Please generate chest numbers first.",
      400
    );
  }

  if (assessment.chestCount < assessment.participantCount) {
    throw new AppError(
      "Chest numbers are incomplete. Please generate chest numbers first.",
      400
    );
  }

  return assessment;
};

const uniqueReceiverIds = (ids = []) =>
  [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];

const resolveOrganizerReceiverIds = async (event) => {
  if (!event?._id) {
    return [];
  }

  const eventType = String(event.eventType || "").trim();
  const eventFor = event.eventFor;

  if (eventType === "State") {
    return uniqueReceiverIds([eventFor]);
  }

  if (eventType === "Club") {
    const club = await Club.findById(eventFor)
      .select("mainMember members")
      .lean();
    if (!club) return [];
    return uniqueReceiverIds([club.mainMember, ...(club.members || [])]);
  }

  if (eventType === "District") {
    const district = await District.findById(eventFor)
      .select("mainMember members")
      .lean();
    if (!district) return [];
    return uniqueReceiverIds([district.mainMember, ...(district.members || [])]);
  }

  return [];
};

const notifyOrganizersChestGeneration = async ({
  event,
  participantCount,
  paidCount,
  pendingCount,
  generatedCount,
  lastChestNo,
}) => {
  const receiverIds = await resolveOrganizerReceiverIds(event);
  if (!receiverIds.length) {
    return { notifiedCount: 0 };
  }

  const eventLabel = String(event?.header || "your event").trim();
  const generatedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });

  const title = "Chest numbers generated";
  const body =
    `Chest numbers are generated for "${eventLabel}". ` +
    `Total registered: ${participantCount} (paid: ${paidCount}, pending: ${pendingCount}). ` +
    `Generated: ${generatedCount}. Last chest no: ${lastChestNo || "N/A"}. ` +
    `Generated at: ${generatedAt}.`;

  await Promise.all(
    receiverIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title,
        body,
        notificationType: "event",
        sentBy: null,
        data: {
          type: "chest_numbers_generated",
          eventId: String(event._id),
          eventType: String(event.eventType || ""),
          eventName: eventLabel,
          totalRegistered: participantCount,
          paidCount,
          pendingCount,
          generatedCount,
          lastChestNo: String(lastChestNo || ""),
          generatedAt,
        },
      }).catch((err) => {
        console.error(
          `Chest generation notification failed for ${receiverId}:`,
          err?.message || err
        );
      })
    )
  );

  return { notifiedCount: receiverIds.length };
};

const notifySkatersChestNumbers = async ({ event, participants, resolveChestNo }) => {
  const eventLabel = String(event?.header || "the event").trim();
  const bySkater = new Map();

  for (const participant of participants) {
    const receiverId = participant?.userId?._id || participant?.userId;
    if (!receiverId) {
      continue;
    }

    const receiverKey = String(receiverId);
    if (bySkater.has(receiverKey)) {
      continue;
    }

    const chestNo =
      typeof resolveChestNo === "function" ? resolveChestNo(participant) : "";
    if (!chestNo) {
      continue;
    }

    bySkater.set(receiverKey, {
      receiverId,
      chestNo: String(chestNo),
      ageGroup: String(participant.ageGroup || "").trim(),
    });
  }

  if (!bySkater.size) {
    return { skaterNotifiedCount: 0 };
  }

  await Promise.all(
    [...bySkater.values()].map(({ receiverId, chestNo, ageGroup }) =>
      sendNotification({
        receiverId,
        title: "Chest number assigned",
        body: `Your chest number for "${eventLabel}" is ${chestNo}.`,
        notificationType: "event",
        sentBy: null,
        data: {
          type: "skater_chest_number",
          eventId: String(event._id),
          eventName: eventLabel,
          chestNo,
          ageGroup,
        },
      }).catch((err) => {
        console.error(
          `Skater chest number notification failed for ${receiverId}:`,
          err?.message || err
        );
      })
    )
  );

  return { skaterNotifiedCount: bySkater.size };
};

const buildChestDoc = (participant, eventId, ageGroup, chestNo) => {
  const fullName = participant.userId?.fullName || participant.name || "";
  const krsaId = String(participant.userId?.krsaId || "").trim();
  const rsfiId = String(participant.userId?.rsfiId || "").trim();

  const doc = {
    fullName,
    gender: participant.userId?.gender || "",
    photo: participant.userId?.photo || "",
    eventId,
    ageGroup,
    categories: (participant.categories || []).map((cat) => ({
      name: cat.name,
    })),
    chestNo,
  };

  if (krsaId) {
    doc.krsaId = krsaId;
  }
  if (rsfiId) {
    doc.rsfiId = rsfiId;
  }

  return doc;
};

const sortParticipantsByName = (participants = []) =>
  [...participants].sort((a, b) => {
    const nameA = (a.userId?.fullName || a.name || "").trim().toLowerCase();
    const nameB = (b.userId?.fullName || b.name || "").trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

const getParticipantSkaterKey = (participant) => {
  const userId = String(participant?.userId?._id || participant?.userId || "").trim();
  const krsaId = String(participant?.userId?.krsaId || "").trim();
  const fullName = String(participant?.userId?.fullName || participant?.name || "")
    .trim()
    .toLowerCase();

  if (userId) {
    return `u:${userId}`;
  }
  if (krsaId) {
    return `k:${krsaId}`;
  }
  if (fullName) {
    return `n:${fullName}`;
  }
  return null;
};

const isSameSkaterAsChestRow = (participant, row) => {
  const krsaId = String(participant?.userId?.krsaId || "").trim();
  const fullName = String(participant?.userId?.fullName || participant?.name || "")
    .trim()
    .toLowerCase();

  if (krsaId && row?.krsaId && String(row.krsaId).trim() === krsaId) {
    return true;
  }
  return String(row?.fullName || "").trim().toLowerCase() === fullName;
};

const chestRowSkaterKey = (row) => {
  const krsaId = String(row?.krsaId || "").trim();
  const fullName = String(row?.fullName || "").trim().toLowerCase();
  if (krsaId) {
    return `k:${krsaId}`;
  }
  if (fullName) {
    return `n:${fullName}`;
  }
  return null;
};

/**
 * One chest-number sequence per event: different skaters never share a number.
 * Same skater in multiple age groups reuses their number.
 */
const buildGlobalChestNumberMap = (allParticipants = [], existingChestDocs = []) => {
  const chestNoBySkaterKey = new Map();
  const chestNoOwnerKey = new Map();

  for (const row of existingChestDocs) {
    const key = chestRowSkaterKey(row);
    const chestNo = row?.chestNo ? String(row.chestNo) : "";
    if (!key || !chestNo || chestNoBySkaterKey.has(key)) {
      continue;
    }
    chestNoBySkaterKey.set(key, chestNo);
    chestNoOwnerKey.set(chestNo, key);
  }

  let nextNum =
    existingChestDocs.reduce((max, row) => {
      const parsed = parseInt(String(row?.chestNo || ""), 10);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0) + 1;

  const takeNextChestNo = () => {
    let chestNo = String(nextNum).padStart(3, "0");
    while (chestNoOwnerKey.has(chestNo)) {
      nextNum += 1;
      chestNo = String(nextNum).padStart(3, "0");
    }
    nextNum += 1;
    return chestNo;
  };

  for (const participant of sortParticipantsByName(allParticipants)) {
    const key = getParticipantSkaterKey(participant);
    if (!key || chestNoBySkaterKey.has(key)) {
      continue;
    }

    const existing = existingChestDocs.find((row) =>
      isSameSkaterAsChestRow(participant, row)
    );
    const chestNo = existing?.chestNo
      ? String(existing.chestNo)
      : takeNextChestNo();

    chestNoBySkaterKey.set(key, chestNo);
    chestNoOwnerKey.set(chestNo, key);
  }

  return {
    resolveChestNo: (participant) => {
      const key = getParticipantSkaterKey(participant);
      return key ? chestNoBySkaterKey.get(key) || "" : "";
    },
  };
};

/** Build EventCompetition.categories[] for one age group from registrations. */
export const buildCompetitionCategoriesFromGroup = (
  groupParticipants = [],
  resolveChestNo
) => {
  const sorted = sortParticipantsByName(groupParticipants);
  const categoriesMap = {};

  for (let i = 0; i < sorted.length; i++) {
    const participant = sorted[i];
    const chestNo =
      typeof resolveChestNo === "function"
        ? resolveChestNo(participant)
        : String(i + 1).padStart(3, "0");
    const fullName = participant.userId?.fullName || participant.name || "";
    const krsaId = participant.userId?.krsaId || "";
    const rsfiId = participant.userId?.rsfiId || "";
    const skaterId = participant.userId?._id || participant.userId || null;

    for (const cat of participant.categories || []) {
      const catName = String(cat?.name || "").trim();
      if (!catName) {
        continue;
      }
      if (!categoriesMap[catName]) {
        categoriesMap[catName] = [];
      }
      categoriesMap[catName].push({
        skaterId,
        chestNo,
        fullName,
        krsaId,
        rsfiId,
        time: "",
        position: "0",
      });
    }
  }

  return Object.keys(categoriesMap).map((catName) => ({
    name: catName,
    "1stRound": categoriesMap[catName],
    "2ndRound": [],
    semiFinal: [],
    final: [],
    "1st": [],
    "2nd": [],
    "3rd": [],
  }));
};

const mergeFirstRoundRows = (existingRows = [], freshRows = []) => {
  if (!Array.isArray(existingRows) || existingRows.length === 0) {
    return freshRows;
  }

  const bySkaterId = new Map(
    existingRows
      .filter((row) => row?.skaterId)
      .map((row) => [String(row.skaterId), row])
  );

  const merged = freshRows.map((row) => {
    const prev = bySkaterId.get(String(row.skaterId));
    if (!prev) {
      return row;
    }
    return {
      ...row,
      chestNo: prev.chestNo || row.chestNo,
      time: prev.time ?? row.time ?? "",
      position: prev.position ?? row.position ?? "0",
    };
  });

  const seen = new Set(merged.map((row) => String(row.skaterId)));
  for (const row of existingRows) {
    if (row?.skaterId && !seen.has(String(row.skaterId))) {
      merged.push(row);
    }
  }

  return merged;
};

/**
 * Ensure EventCompetition rows exist for registered skaters (club, district, state).
 * Safe to call on read — fills missing docs / empty 1stRound without wiping later rounds.
 */
export const syncEventCompetitionFromParticipants = async (
  eventId,
  { ageGroup = null } = {}
) => {
  const participants = await EventParticipant.find(chestParticipantFilter(eventId)).populate(
    "userId"
  );

  if (!participants.length) {
    return { synced: false, reason: "no_participants" };
  }

  const groups = {};
  for (const participant of participants) {
    const groupLabel = participant.ageGroup || "Unknown";
    if (ageGroup && groupLabel !== ageGroup) {
      continue;
    }
    if (!groups[groupLabel]) {
      groups[groupLabel] = [];
    }
    groups[groupLabel].push(participant);
  }

  const existingChest = await SkaterChestNo.find({ eventId }).lean();
  const { resolveChestNo } = buildGlobalChestNumberMap(participants, existingChest);

  let syncedAgeGroups = 0;

  for (const groupLabel of Object.keys(groups)) {
    const groupParticipants = groups[groupLabel];
    const freshCategories = buildCompetitionCategoriesFromGroup(
      groupParticipants,
      resolveChestNo
    );

    if (!freshCategories.length) {
      continue;
    }

    let competition = await EventCompetition.findOne({
      eventId,
      ageGroup: groupLabel,
    });

    if (!competition) {
      await EventCompetition.create({
        eventId,
        ageGroup: groupLabel,
        categories: freshCategories,
      });
      syncedAgeGroups += 1;
      continue;
    }

    let dirty = false;

    for (const freshCat of freshCategories) {
      const normName = String(freshCat.name || "").trim().toLowerCase();
      let category = (competition.categories || []).find(
        (row) => String(row?.name || "").trim().toLowerCase() === normName
      );

      if (!category) {
        competition.categories.push(freshCat);
        dirty = true;
        continue;
      }

      const mergedFirst = mergeFirstRoundRows(
        category["1stRound"] || [],
        freshCat["1stRound"] || []
      );

      const prevFirst = category["1stRound"] || [];
      if (
        mergedFirst.length !== prevFirst.length ||
        mergedFirst.some(
          (row, idx) => String(row?.skaterId) !== String(prevFirst[idx]?.skaterId)
        )
      ) {
        if (typeof category.set === "function") {
          category.set("1stRound", mergedFirst);
        } else {
          category["1stRound"] = mergedFirst;
        }
        dirty = true;
      }
    }

    if (dirty) {
      competition.markModified("categories");
      await competition.save();
      syncedAgeGroups += 1;
    }
  }

  return { synced: syncedAgeGroups > 0, syncedAgeGroups };
};

/**
 * Generates chest numbers for a specific event.
 * Groups paid participants by age group, sorts them alphabetically by name,
 * and assigns chest numbers "001", "002", etc.
 * Also populates EventCompetition model for each age group and category.
 */
export const generateChestNumbersForEvent = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error(`Event not found for ID: ${eventId}`);
  }

  const participants = await EventParticipant.find(
    chestParticipantFilter(event._id)
  ).populate("userId");

  if (!participants.length) {
    console.log(
      `No eligible participants (paid/pending) for event: ${event.header} (${eventId})`
    );
    return { success: true, count: 0, notifiedCount: 0 };
  }

  const groups = {};
  for (const participant of participants) {
    const ageGroup = participant.ageGroup || "Unknown";
    if (!groups[ageGroup]) {
      groups[ageGroup] = [];
    }
    groups[ageGroup].push(participant);
  }

  const { resolveChestNo } = buildGlobalChestNumberMap(participants);

  await SkaterChestNo.deleteMany({ eventId: event._id });
  await EventCompetition.deleteMany({ eventId: event._id });

  let totalGenerated = 0;
  let maxChestNoInt = 0;

  for (const ageGroup in groups) {
    const groupParticipants = sortParticipantsByName(groups[ageGroup]);

    const skaterChestDocs = groupParticipants
      .map((participant) =>
        buildChestDoc(participant, event._id, ageGroup, resolveChestNo(participant))
      )
      .filter((doc) => doc.chestNo);

    if (!skaterChestDocs.length) {
      continue;
    }

    await SkaterChestNo.insertMany(skaterChestDocs);
    totalGenerated += skaterChestDocs.length;
    for (const row of skaterChestDocs) {
      const parsed = parseInt(String(row.chestNo || ""), 10);
      if (Number.isFinite(parsed) && parsed > maxChestNoInt) {
        maxChestNoInt = parsed;
      }
    }

    const categoriesArray = buildCompetitionCategoriesFromGroup(
      groupParticipants,
      resolveChestNo
    );

    if (categoriesArray.length > 0) {
      await EventCompetition.create({
        eventId: event._id,
        ageGroup,
        categories: categoriesArray,
      });
    }
  }

  console.log(
    `Generated ${totalGenerated} chest numbers and created EventCompetition records for event: ${event.header} (${eventId})`
  );

  const paidCount = participants.filter(
    (row) => String(row.paymentStatus || "").trim() === "paid"
  ).length;
  const pendingCount = participants.filter(
    (row) => String(row.paymentStatus || "").trim() === "pending"
  ).length;
  const lastChestNo = maxChestNoInt > 0 ? String(maxChestNoInt).padStart(3, "0") : "";

  const [organizerNotificationResult, skaterNotificationResult] = await Promise.all([
    notifyOrganizersChestGeneration({
      event,
      participantCount: participants.length,
      paidCount,
      pendingCount,
      generatedCount: totalGenerated,
      lastChestNo,
    }),
    notifySkatersChestNumbers({
      event,
      participants,
      resolveChestNo,
    }),
  ]);

  return {
    success: true,
    count: totalGenerated,
    lastChestNo,
    notifiedCount: organizerNotificationResult.notifiedCount,
    skaterNotifiedCount: skaterNotificationResult.skaterNotifiedCount,
  };
};

/**
 * Daily scheduler job: generate chest numbers for events with closed registration.
 * Timing is only controlled by the scheduler (e.g. 13:17) — no extra 24h delay.
 */
export const generateChestNumbersForExpiredEvents = async () => {
  console.log("Checking for events eligible for chest number generation...");

  const now = new Date();

  const candidateEvents = await Event.find({
    status: { $ne: "cancelled" },
    registerEndDate: { $ne: null },
    ...approvedPublicEventFilter(),
  })
    .select("_id header registerEndDate")
    .lean();

  const eligibleEvents = candidateEvents.filter((event) =>
    isRegistrationClosedForChestGeneration(event.registerEndDate, now)
  );

  console.log(
    `Found ${eligibleEvents.length} eligible event(s) (registration closed; run at scheduled time).`
  );

  let eventsProcessed = 0;

  for (const event of eligibleEvents) {
    const assessment = await assessChestGenerationForEvent(event._id);

    if (!assessment.shouldRun) {
      console.log(
        `Skip "${event.header}" (${event._id}): ${assessment.reason} — eligible=${assessment.participantCount}, paid=${assessment.paidCount}, pending=${assessment.pendingCount}, chest=${assessment.chestCount}`
      );
      continue;
    }

    console.log(
      `Generate "${event.header}" (${event._id}): ${assessment.reason} — eligible=${assessment.participantCount}, paid=${assessment.paidCount}, pending=${assessment.pendingCount}, existing chest=${assessment.chestCount}`
    );

    try {
      const result = await generateChestNumbersForEvent(event._id);
      if (result.count > 0) {
        eventsProcessed++;
        console.log(
          `Created ${result.count} chest number(s) for "${event.header}" (${event._id})`
        );
      } else {
        console.log(
          `No chest numbers created for "${event.header}" (${event._id}) — check participants/categories`
        );
      }
    } catch (err) {
      console.error(
        `Failed to generate chest numbers for event: ${event.header} (${event._id})`,
        err
      );
    }
  }

  console.log(`Eligible events processed: ${eventsProcessed}`);
  return { success: true, processedEventsCount: eventsProcessed };
};

/**
 * Manual trigger for a single event — same eligibility rules as the scheduler,
 * without regenerating when chest numbers are already complete.
 */
export const triggerManualChestNumberGenerationForEvent = async (eventId) => {
  const event = await Event.findById(eventId)
    .select("_id header registerEndDate status")
    .lean();

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  if (String(event.status || "").trim() === "cancelled") {
    throw new AppError("Cannot generate chest numbers for a cancelled event", 400);
  }

  if (!event.registerEndDate) {
    throw new AppError("Event registration end date is not set", 400);
  }

  if (!isRegistrationClosedForChestGeneration(event.registerEndDate)) {
    throw new AppError(
      "Registration is still open. Chest numbers can be generated after registration ends.",
      400
    );
  }

  const assessment = await assessChestGenerationForEvent(event._id);

  if (assessment.reason === "chest_numbers_already_complete") {
    return {
      success: true,
      alreadyGenerated: true,
      message: "Chest numbers already generated",
      participantCount: assessment.participantCount,
      paidCount: assessment.paidCount,
      pendingCount: assessment.pendingCount,
      chestCount: assessment.chestCount,
      count: assessment.chestCount,
    };
  }

  if (assessment.reason === "no_eligible_participants") {
    throw new AppError(
      "No eligible participants found for chest number generation",
      400
    );
  }

  const result = await generateChestNumbersForEvent(event._id);

  return {
    success: true,
    alreadyGenerated: false,
    message: `Successfully generated ${result.count} skater chest numbers`,
    participantCount: assessment.participantCount,
    paidCount: assessment.paidCount,
    pendingCount: assessment.pendingCount,
    chestCount: result.count,
    ...result,
  };
};

const buildAgeCategoryKey = (ageGroup, categoryName) =>
  `${String(ageGroup || "").trim()}::${String(categoryName || "").trim()}`;

const mapSkaterSummary = (row) => ({
  chestNo: String(row?.chestNo || ""),
  fullName: String(row?.fullName || ""),
  krsaId: String(row?.krsaId || ""),
  rsfiId: String(row?.rsfiId || ""),
  gender: String(row?.gender || ""),
  email: String(row?.email || ""),
  phone: String(row?.phone || ""),
  paymentStatus: String(row?.paymentStatus || ""),
  attendanceStatus: String(row?.attendanceStatus || ""),
});

const resolveChestNoForParticipant = (chestDocs = [], participant) => {
  const ageGroup = String(participant?.ageGroup || "").trim();
  const krsaId = String(participant?.userId?.krsaId || "").trim();
  const fullName = String(participant?.userId?.fullName || participant?.name || "")
    .trim()
    .toLowerCase();

  const matched =
    chestDocs.find(
      (row) =>
        String(row.ageGroup || "").trim() === ageGroup &&
        ((krsaId && row.krsaId && String(row.krsaId).trim() === krsaId) ||
          String(row.fullName || "").trim().toLowerCase() === fullName)
    ) ||
    chestDocs.find(
      (row) =>
        (krsaId && row.krsaId && String(row.krsaId).trim() === krsaId) ||
        String(row.fullName || "").trim().toLowerCase() === fullName
    );

  return matched?.chestNo ? String(matched.chestNo) : "";
};

const buildRegisteredSkatersByKey = (participants = [], chestDocs = []) => {
  const skatersByKey = new Map();

  for (const participant of participants) {
    const ageGroup = String(participant.ageGroup || "").trim();
    const chestNo = resolveChestNoForParticipant(chestDocs, participant);
    const fullName = String(participant.userId?.fullName || participant.name || "").trim();
    const krsaId = String(participant.userId?.krsaId || "").trim();
    const rsfiId = String(participant.userId?.rsfiId || "").trim();
    const gender = String(participant.userId?.gender || "").trim();
    const email = String(participant.userId?.email || "").trim();
    const phone = String(participant.userId?.phone || "").trim();
    const paymentStatus = String(participant.paymentStatus || "").trim();

    for (const category of participant.categories || []) {
      const name = String(category?.name || "").trim();
      if (!name) continue;

      const key = buildAgeCategoryKey(ageGroup, name);
      if (!skatersByKey.has(key)) {
        skatersByKey.set(key, []);
      }

      skatersByKey.get(key).push(
        mapSkaterSummary({
          chestNo,
          fullName,
          krsaId,
          rsfiId,
          gender,
          email,
          phone,
          paymentStatus,
          attendanceStatus: category?.attendanceStatus || "pending",
        })
      );
    }
  }

  return skatersByKey;
};

const flattenSummaryAttendees = (skatingCategories = []) => {
  const rows = [];

  for (const skatingCategory of skatingCategories) {
    const discipline = String(skatingCategory?.typeName || "").trim();
    for (const ageGroupEntry of skatingCategory?.ageGroups || []) {
      const ageGroup = String(ageGroupEntry?.label || "").trim();
      for (const category of ageGroupEntry?.categories || []) {
        const lap = String(category?.name || "").trim();
        for (const skater of category?.skaters || []) {
          rows.push({
            id: `${skatingCategory.id}-${ageGroup}-${lap}-${skater.chestNo}-${skater.krsaId}-${skater.fullName}`,
            discipline,
            ageGroup,
            lap,
            fullName: String(skater.fullName || "").trim(),
            chestNo: String(skater.chestNo || "").trim(),
            krsaId: String(skater.krsaId || "").trim(),
            rsfiId: String(skater.rsfiId || "").trim(),
            gender: String(skater.gender || "").trim(),
            email: String(skater.email || "").trim(),
            phone: String(skater.phone || "").trim(),
            paymentStatus: String(skater.paymentStatus || "").trim(),
            attendanceStatus: String(skater.attendanceStatus || "pending").trim(),
          });
        }
      }
    }
  }

  return rows;
};

const filterSummaryAttendees = (rows, { search, ageGroup, lap, discipline }) => {
  const term = String(search || "").trim().toLowerCase();
  const ageFilter = String(ageGroup || "").trim();
  const lapFilter = String(lap || "").trim();
  const disciplineFilter = String(discipline || "").trim();

  return rows.filter((row) => {
    const matchesSearch =
      !term ||
      row.fullName.toLowerCase().includes(term) ||
      row.chestNo.toLowerCase().includes(term) ||
      row.krsaId.toLowerCase().includes(term) ||
      row.rsfiId.toLowerCase().includes(term) ||
      String(row.email || "")
        .toLowerCase()
        .includes(term) ||
      String(row.phone || "")
        .toLowerCase()
        .includes(term);
    const matchesAgeGroup = !ageFilter || row.ageGroup === ageFilter;
    const matchesLap = !lapFilter || row.lap === lapFilter;
    const matchesDiscipline = !disciplineFilter || row.discipline === disciplineFilter;
    return matchesSearch && matchesAgeGroup && matchesLap && matchesDiscipline;
  });
};

const buildSummaryFilterOptions = (rows = []) => ({
  ageGroups: [...new Set(rows.map((row) => row.ageGroup).filter(Boolean))].sort(),
  laps: [...new Set(rows.map((row) => row.lap).filter(Boolean))].sort(),
  disciplines: [...new Set(rows.map((row) => row.discipline).filter(Boolean))].sort(),
});

/**
 * Registration + chest-number counts aligned with the event's age groups and laps.
 * Returns a flat paginated attendee list for admin/portal tables.
 */
export const getChestNumberSummaryByEvent = async (
  eventId,
  { page = 1, limit = 10, search = "", ageGroup = "", lap = "", discipline = "" } = {}
) => {
  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const participantFilter = chestParticipantFilter(eventId);
  const [chestDocs, participants] = await Promise.all([
    SkaterChestNo.find({ eventId }).sort({ ageGroup: 1, chestNo: 1 }).lean(),
    EventParticipant.find(participantFilter)
      .select("ageGroup categories name userId paymentStatus")
      .populate("userId", "fullName krsaId rsfiId gender email phone")
      .lean(),
  ]);

  const registrationCountByKey = new Map();
  for (const participant of participants) {
    const ageGroup = String(participant.ageGroup || "").trim();
    for (const category of participant.categories || []) {
      const name = String(category?.name || "").trim();
      if (!name) continue;
      const key = buildAgeCategoryKey(ageGroup, name);
      registrationCountByKey.set(key, (registrationCountByKey.get(key) || 0) + 1);
    }
  }

  const registeredSkatersByKey = buildRegisteredSkatersByKey(participants, chestDocs);

  const chestCountByKey = new Map();
  for (const row of chestDocs) {
    const ageGroup = String(row.ageGroup || "").trim();
    for (const category of row.categories || []) {
      const name = String(category?.name || "").trim();
      if (!name) continue;
      const key = buildAgeCategoryKey(ageGroup, name);
      chestCountByKey.set(key, (chestCountByKey.get(key) || 0) + 1);
    }
  }

  const resolvedCategories = eventMeta.skatingEventCategories || [];

  const skatingCategories = resolvedCategories.map((skatingCategory) => {
    const ageGroups = (skatingCategory.ageGroups || [])
      .filter((ageGroupEntry) => (ageGroupEntry.categories || []).length > 0)
      .map((ageGroupEntry) => {
        const label = String(ageGroupEntry.label || "").trim();
        const categories = (ageGroupEntry.categories || []).map((subCategory) => {
          const name = String(subCategory.name || "").trim();
          const key = buildAgeCategoryKey(label, name);
          return {
            name,
            registeredCount: registrationCountByKey.get(key) || 0,
            chestCount: chestCountByKey.get(key) || 0,
            skaters: registeredSkatersByKey.get(key) || [],
          };
        });

        const totalRegistered = participants.filter(
          (row) => String(row.ageGroup || "").trim() === label
        ).length;
        const totalWithChestNo = chestDocs.filter(
          (row) => String(row.ageGroup || "").trim() === label
        ).length;

        return {
          label,
          totalRegistered,
          totalWithChestNo,
          categories,
        };
      });

    return {
      id: skatingCategory._id,
      typeName: skatingCategory.typeName || "",
      ageGroups,
    };
  });

  const uniqueChestSkaterKeys = new Set(
    chestDocs
      .map((row) => String(row.krsaId || row.fullName || "").trim())
      .filter(Boolean)
  );

  const allAttendees = flattenSummaryAttendees(skatingCategories);
  const filteredAttendees = filterSummaryAttendees(allAttendees, {
    search,
    ageGroup,
    lap,
    discipline,
  });
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const attendees = filteredAttendees.slice(skip, skip + pageLimit);

  return {
    eventId,
    eventName: eventMeta.eventName || "",
    totalRegistered: participants.length,
    totalWithChestNo: chestDocs.length,
    uniqueSkatersWithChestNo: uniqueChestSkaterKeys.size,
    filters: buildSummaryFilterOptions(allAttendees),
    attendees,
    pagination: buildPaginationMeta({
      total: filteredAttendees.length,
      page: currentPage,
      limit: pageLimit,
    }),
    skatingCategories,
  };
};
