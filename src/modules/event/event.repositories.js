import { Event } from "./event.model.js";
import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { Club } from "../club/club.model.js";
import mongoose from "mongoose";
import { sendNotification } from "../../util/firebase/sendNotification.js";

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


export const clubRelatedEventDisplayRepositories = async (
  clubId,
  { page, limit }
) => {
console.log("pppppppppppp")
  const query = {
    eventType: "Club",
    eventFor: new mongoose.Types.ObjectId(clubId),
  };

  const {
    skip,
    limit: pageLimit,
    page: currentPage
  } = paginate(page,limit);

  const events = await Event.find(query)
    .sort({ createdAt:-1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  return {
    data: events,
    pagination: {
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    }
  };
};

export const createClubEventRepositories = async (clubId, data) => {
  let resolvedClubId = clubId;

  const clubByMember = await Club.findOne({
    members: new mongoose.Types.ObjectId(clubId),
  })
    .select("_id")
    .lean();

  if (clubByMember?._id) {
    resolvedClubId = clubByMember._id;
  }

  const payload = {
    ...data,
    eventType: "Club",
    eventFor: new mongoose.Types.ObjectId(resolvedClubId),
  };
console.log(payload,"===========")
  const event = await Event.create(payload);
  console.log(resolvedClubId,"resolvedClubIdresolvedClubIdresolvedClubId")
  const club = await Club.findById(resolvedClubId)
    .select("name members")
    .lean();

  if (!club) return event;

  const skaters = await Skater.find({ club: resolvedClubId })
    .select("_id")
    .lean();

  const targetUserIds = [
    ...(club.members || []).map((id) => id.toString()),
    ...skaters.map((skater) => skater._id.toString()),
  ];

  const uniqueUserIds = [...new Set(targetUserIds)];

  await Promise.all(
    uniqueUserIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title: "New Club Event",
        body: `${club.name} created a new event: ${event.header}`,
        notificationType: "event",
        sentBy: resolvedClubId,
        data: {
          eventId: event._id,
          clubId: resolvedClubId,
          eventType: "Club",
        },
      })
    )
  );

  return event;
};

export const districtRelatedEventDisplayRepositories = async (districtUserId, { page, limit }) => {
  const districtUser = await BaseAuth.findById(districtUserId).select("district").lean();
  const districtId = districtUser?.district || districtUserId;

  const query = {
    eventType: "District",
    eventFor: new mongoose.Types.ObjectId(districtId),
  };

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const events = await Event.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: Math.ceil(total / pageLimit),
    data: events,
  };
};

export const createDistrictEventRepositories = async (districtUserId, data) => {
  const districtUser = await BaseAuth.findById(districtUserId).select("district").lean();
  const districtId = districtUser?.district || districtUserId;

  const payload = {
    ...data,
    eventType: "District",
    eventFor: new mongoose.Types.ObjectId(districtId),
  };

  return Event.create(payload);
};

export const stateRelatedEventDisplayRepositories = async (stateId, { page, limit }) => {
  const query = {
    eventType: "State",
    eventFor: new mongoose.Types.ObjectId(stateId),
  };

  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const events = await Event.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: Math.ceil(total / pageLimit),
    data: events,
  };
};

export const createStateEventRepositories = async (stateId, data) => {
  const payload = {
    ...data,
    eventType: "State",
    eventFor: new mongoose.Types.ObjectId(stateId),
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

