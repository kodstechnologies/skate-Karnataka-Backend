import { EventParticipant } from "../event/eventParticipant.model.js";
import { Event } from "../event/event.model.js";
import { approvedPublicEventFilter } from "../event/eventApprovalPolicy.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";
import { EventCompetition } from "./eventCompetition.model.js";

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
    return { success: true, count: 0 };
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
  return { success: true, count: totalGenerated };
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
