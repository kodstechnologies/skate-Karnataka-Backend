import { Event } from "./event.model.js";
import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";

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


const displaySingleEventRepository = async (id) => {

    return await Event.findById(id).lean();
}

const display_latest_event_repositories = async () => {

    const events = await Event.find({ status: "active" }) // only active
        .sort({ createdAt: -1 }) // latest first
        .limit(1); // optional: only top 5

    return events;
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
  // ✅ Get user
  const user = await BaseAuth.findById(userId)
    .populate("district")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const userDistrict = user.district?._id || user.district;
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

