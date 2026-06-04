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

  let totalGenerated = 0;

  for (const ageGroup in groups) {
    const groupParticipants = groups[ageGroup];

    groupParticipants.sort((a, b) => {
      const nameA = (a.userId?.fullName || a.name || "").trim().toLowerCase();
      const nameB = (b.userId?.fullName || b.name || "").trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const skaterChestDocs = groupParticipants.map((participant, index) =>
      buildChestDoc(
        participant,
        event._id,
        ageGroup,
        String(index + 1).padStart(3, "0")
      )
    );

    if (!skaterChestDocs.length) {
      continue;
    }

    await SkaterChestNo.deleteMany({ eventId: event._id, ageGroup });
    await SkaterChestNo.insertMany(skaterChestDocs);
    totalGenerated += skaterChestDocs.length;

    const categoriesMap = {};
    for (let i = 0; i < groupParticipants.length; i++) {
      const participant = groupParticipants[i];
      const chestNo = String(i + 1).padStart(3, "0");

      const fullName = participant.userId?.fullName || participant.name || "";
      const krsaId = participant.userId?.krsaId || "";
      const rsfiId = participant.userId?.rsfiId || "";
      const skaterId = participant.userId?._id || participant.userId || null;

      for (const cat of participant.categories || []) {
        const catName = cat.name;
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

    const categoriesArray = [];
    for (const catName in categoriesMap) {
      categoriesArray.push({
        name: catName,
        "1stRound": categoriesMap[catName],
        "2ndRound": [],
        "semiFinal": [],
        "final": [],
        "1st": [],
        "2nd": [],
        "3rd": [],
      });
    }

    if (categoriesArray.length > 0) {
      await EventCompetition.deleteMany({ eventId: event._id, ageGroup });
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
