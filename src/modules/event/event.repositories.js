import { Event } from "./event.model.js";
import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import mongoose from "mongoose";

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
    totalPages: Math.ceil(total / pageLimit),
    data: events
  };
};

export const clubRelatedEventDisplayRepositories = async (clubId) => {
    const events = await Event.find({
        eventType: "Club",
        eventFor: new mongoose.Types.ObjectId(clubId), // ✅ ensure ObjectId
    })
        .sort({ createdAt: -1 }) // latest first
        .lean();

    return events;
};

export const createClubEventRepositories = async (clubId, data) => {
  const payload = {
    ...data,
    eventType: "Club",
    eventFor: new mongoose.Types.ObjectId(clubId),
  };

  return Event.create(payload);
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

const display_latest_event_repositories = async (userId) => {
  // ✅ Get skater profile first (contains club), fallback to BaseAuth
  const user = (await Skater.findById(userId).select("district club").lean())
    || (await BaseAuth.findById(userId).select("district").lean());

  if (!user) {
    throw new Error("User not found");
  }

  const userDistrict = user.district;
  const userClub = user.club;

  // ✅ Build query
  const query = {
    $or: [
      { eventType: "State" },
      ...(userDistrict
        ? [{ eventType: "District", eventFor: userDistrict }]
        : []),
      ...(userClub
        ? [{ eventType: "Club", eventFor: userClub }]
        : []),
    ],
  };

  // ✅ Get latest event
  const event = await Event.findOne(query)
    .sort({ createdAt: -1 })
    .populate("eventFor", "name")
    .lean();

  if (!event) return null;

  // ✅ Return cleaned response directly
  return {
    id: event._id,
    header: event.header,
    image: event.image
      ? `${event.image}`
      : "",
    date: event.date,
    address: event.address,
    eventType: event.eventType,
    eventForName:
      event.eventType === "State"
        ? "State"
        : event.eventFor?.name || "N/A",
    status: event.status,
    colorOne: event.colorOne,
    colorTwo: event.colorTwo,
    textColor: event.textColor,
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
  const event = await Event.findByIdAndDelete(id);
}


const display_all_event_based_on_user_repositories = async (userId, { page, limit }) => {
  console.log(userId,"userId===")
  // ✅ Get skater profile first (contains club), fallback to BaseAuth
  const user = (await Skater.findById(userId).select("district club").lean())
    || (await BaseAuth.findById(userId).select("district").lean());

  if (!user) {
    throw new Error("User not found");
  }

  const userDistrict = user.district;
  const userClub = user.club;

  // ✅ Query
  const query = {
    $or: [
      { eventType: "State" },
      ...(userDistrict
        ? [{ eventType: "District", eventFor: userDistrict }]
        : []),
      ...(userClub
        ? [{ eventType: "Club", eventFor: userClub }]
        : []),
    ],
  };

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  // ✅ Fetch + Populate dynamic ref
  const events = await Event.find(query)
    .populate({
      path: "eventFor",
      select: "name districtName clubName", // based on your models
    })
    .sort({ date: 1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  // ✅ Format response (IMPORTANT 🔥)
  const formattedEvents = events.map((event) => ({
    id: event._id,
    header: event.header,
    image: event.image,
    date: event.date,
    address: event.address,
    eventType: event.eventType,
    colorOne: event.colorOne,
    colorTwo: event.colorTwo,
    textColor: event.textColor,

    // 👇 get name dynamically
    eventForName:
      event.eventType === "State"
        ? "State"
        : event.eventType === "District"
          ? event.eventFor?.name || event.eventFor?.districtName || "N/A"
          : event.eventType === "Club"
            ? event.eventFor?.name || event.eventFor?.clubName || "N/A"
            : "N/A",
  }));

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: Math.ceil(total / pageLimit),
    data: formattedEvents,
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

