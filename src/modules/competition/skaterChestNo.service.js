import { EventParticipant } from "../event/eventParticipant.model.js";
import { Event } from "../event/event.model.js";
import { SkaterChestNo } from "./SkaterChestNo.model.js";

/**
 * Generates chest numbers for a specific event.
 * Groups paid participants by age group, sorts them alphabetically by name,
 * and assigns chest numbers "001", "002", etc.
 */
export const generateChestNumbersForEvent = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error(`Event not found for ID: ${eventId}`);
  }

  // Fetch all paid participants for this event
  const participants = await EventParticipant.find({
    eventId: event._id,
    paymentStatus: "paid",
  }).populate("userId");

  if (!participants.length) {
    console.log(`No paid participants found for event: ${event.header} (${eventId})`);
    return { success: true, count: 0 };
  }

  // Group participants by ageGroup
  const groups = {};
  for (const p of participants) {
    const ageGroup = p.ageGroup || "Unknown";
    if (!groups[ageGroup]) {
      groups[ageGroup] = [];
    }
    groups[ageGroup].push(p);
  }

  let totalGenerated = 0;

  for (const ageGroup in groups) {
    const groupParticipants = groups[ageGroup];

    // Sort alphabetically by name (populated fullName, falling back to name field)
    groupParticipants.sort((a, b) => {
      const nameA = (a.userId?.fullName || a.name || "").trim().toLowerCase();
      const nameB = (b.userId?.fullName || b.name || "").trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const skaterChestDocs = [];
    for (let i = 0; i < groupParticipants.length; i++) {
      const participant = groupParticipants[i];
      const chestNo = String(i + 1).padStart(3, "0"); // "001", "002", ...

      // Categories array of names
      const categories = (participant.categories || []).map((cat) => ({
        name: cat.name,
      }));

      const fullName = participant.userId?.fullName || participant.name || "";
      const gender = participant.userId?.gender || "";
      const photo = participant.userId?.photo || "";
      const krsaId = participant.userId?.krsaId || "";
      const rsfiId = participant.userId?.rsfiId || "";

      skaterChestDocs.push({
        fullName,
        gender,
        photo,
        krsaId,
        rsfiId,
        eventId: event._id,
        ageGroup,
        categories,
        chestNo,
      });
    }

    if (skaterChestDocs.length > 0) {
      // Delete existing chest numbers for this event & ageGroup first to allow regeneration/idempotency
      await SkaterChestNo.deleteMany({ eventId: event._id, ageGroup });
      await SkaterChestNo.insertMany(skaterChestDocs);
      totalGenerated += skaterChestDocs.length;
    }
  }

  console.log(`Generated ${totalGenerated} chest numbers for event: ${event.header} (${eventId})`);
  return { success: true, count: totalGenerated };
};

/**
 * Scans all events that closed registration at least 24 hours ago,
 * and generates chest numbers for them if not already generated.
 */
export const generateChestNumbersForExpiredEvents = async () => {
  console.log("Checking for expired events to generate chest numbers...");
  
  // Registration end date + 1 day < current time
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const events = await Event.find({
    registerEndDate: { $lt: oneDayAgo }
  });

  console.log(`Found ${events.length} events where registration closed > 1 day ago.`);

  let eventsProcessed = 0;
  for (const event of events) {
    const exists = await SkaterChestNo.exists({ eventId: event._id });
    if (exists) {
      // Already generated, skip
      continue;
    }
    
    try {
      await generateChestNumbersForEvent(event._id);
      eventsProcessed++;
    } catch (err) {
      console.error(`Failed to generate chest numbers for event: ${event.header} (${event._id})`, err);
    }
  }

  console.log(`Expired events processed: ${eventsProcessed}`);
  return { success: true, processedEventsCount: eventsProcessed };
};
