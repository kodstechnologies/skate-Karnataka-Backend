import { Event } from "./event.model.js";
import SkatingEventCategory from "./SkatingEventCategory.model.js";
import { EventParticipant } from "./eventParticipant.model.js";
import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { State } from "../state/state.model.js";
import mongoose from "mongoose";
import { sendNotification } from "../../util/firebase/sendNotification.js";
import { AppError } from "../../util/common/AppError.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeAttendanceStatus = (status) =>
  status === "apsent" ? "absent" : status;

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

export const getAllEventCategoriesRepository = async ({ page, limit }) => {
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

  const data = await SkatingEventCategory.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await SkatingEventCategory.countDocuments();

  return {
    total,
    page: currentPage,
    limit: pageLimit,
    totalPages: Math.ceil(total / pageLimit),
    data,
  };
};

export const getEventCategoryByIdRepository = async (id) => {
  return await SkatingEventCategory.findById(id).lean();
};

export const createEventCategoryRepository = async (payload) => {
  return await SkatingEventCategory.create(payload);
};

export const updateEventCategoryRepository = async (id, payload) => {
  return await SkatingEventCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();
};

export const deleteEventCategoryRepository = async (id) => {
  return await SkatingEventCategory.findByIdAndDelete(id).lean();
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

export const getRegisterFormByIdRepository = async (id, userId) => {
  const item = await EventParticipant.findOne({ _id: id, userId })
    .populate(
      "eventId",
      "header registerStartDate registerEndDate eventStartDate eventEndDate eventStartTime eventEndTime address eventType status"
    )
    .lean();

  if (!item) return null;

  return {
    id: item._id,
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

export const createRegisterFormRepository = async (payload) => {
  return await EventParticipant.create(payload);
};

export const listEventSkatersByEventIdRepository = async (
  eventId,
  { page, limit, search, ageGroup, categoryName }
) => {
  const oid = new mongoose.Types.ObjectId(eventId);
  const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
  const usersCol = BaseAuth.collection.name;

  const initialMatch = { eventId: oid };
  const ageTerm = typeof ageGroup === "string" ? ageGroup.trim() : "";
  if (ageTerm) {
    initialMatch.ageGroup = ageTerm;
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
        ],
      },
    });
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
    totalPages: Math.ceil(total / pageLimit) || 0,
  };
};

export const listEventSkatersBasicByEventIdRepository = async (eventId) => {
  const participants = await EventParticipant.find({
    eventId: new mongoose.Types.ObjectId(eventId),
  })
    .select("name userId")
    .populate("userId", "fullName krsaId phone email")
    .lean();

  const skaters = participants.map((participant) => ({
    name: participant.name || participant.userId?.fullName || "",
    krsaId: participant.userId?.krsaId || "",
    phone: participant.userId?.phone || "",
    email: participant.userId?.email || "",
  }));

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
    const sorted = [...group.results].sort((a, b) => {
      if (a.isDisqualified !== b.isDisqualified) {
        return a.isDisqualified ? 1 : -1;
      }

      const aTime = typeof a.timeTaken === "number" ? a.timeTaken : null;
      const bTime = typeof b.timeTaken === "number" ? b.timeTaken : null;

      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime;
    });

    let runningRank = 0;
    for (const row of sorted) {
      const hasValidTime = typeof row.timeTaken === "number";
      if (row.isDisqualified || !hasValidTime) {
        row.rank = null;
      } else {
        runningRank += 1;
        row.rank = runningRank;
      }
    }

    return {
      ...group,
      totalSkaters: sorted.length,
      results: sorted,
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

    participant.categories = participant.categories.map((category) => {
      const categoryObj = category.toObject();
      const incoming = inputByName.get(String(categoryObj.name || "").trim());
      if (!incoming) {
        return categoryObj;
      }

      return {
        ...categoryObj,
        timeTaken:
          incoming.timeTaken !== undefined ? incoming.timeTaken : categoryObj.timeTaken,
        rank: incoming.rank !== undefined ? incoming.rank : categoryObj.rank,
        isDisqualified:
          incoming.isDisqualified !== undefined
            ? incoming.isDisqualified
            : typeof forceDisqualified === "boolean"
              ? forceDisqualified
              : categoryObj.isDisqualified,
        remarks: incoming.remarks !== undefined ? incoming.remarks : categoryObj.remarks,
        attendanceStatus:
          incoming.attendanceStatus !== undefined
            ? normalizeAttendanceStatus(incoming.attendanceStatus)
            : categoryObj.attendanceStatus || "pending",
      };
    });
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

  const event = await Event.create(payload);

  const district = await District.findById(districtId)
    .select("name members")
    .lean();

  if (!district) return event;

  const clubs = await Club.find({ district: districtId })
    .select("_id members")
    .lean();

  const clubIds = clubs.map((club) => club._id);

  const skaters = clubIds.length
    ? await Skater.find({ club: { $in: clubIds } })
      .select("_id")
      .lean()
    : [];

  const targetUserIds = [
    ...(district.members || []).map((id) => id.toString()),
    ...clubs.flatMap((club) => (club.members || []).map((id) => id.toString())),
    ...skaters.map((skater) => skater._id.toString()),
  ];

  const uniqueUserIds = [...new Set(targetUserIds)];

  await Promise.all(
    uniqueUserIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title: "New District Event",
        body: `${district.name} created a new event: ${event.header}`,
        notificationType: "event",
        sentBy: districtId,
        data: {
          eventId: event._id,
          districtId,
          eventType: "District",
        },
      })
    )
  );

  return event;
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

  const event = await Event.create(payload);

  const state = await State.findById(stateId)
    .select("name")
    .lean();

  const [stateUsers, districts, clubs, skaters, fallbackUsers] = await Promise.all([
    BaseAuth.find({ role: "State" }).select("_id").lean(),
    District.find().select("members").lean(),
    Club.find().select("members").lean(),
    Skater.find().select("_id").lean(),
    BaseAuth.find({
      role: { $in: ["State", "District", "Club", "Skater"] },
      isActive: true,
    })
      .select("_id")
      .lean(),
  ]);

  const targetUserIds = [
    ...stateUsers.map((user) => user._id.toString()),
    ...districts.flatMap((district) => (district.members || []).map((id) => id.toString())),
    ...clubs.flatMap((club) => (club.members || []).map((id) => id.toString())),
    ...skaters.map((skater) => skater._id.toString()),
  ];

  let uniqueUserIds = [...new Set(targetUserIds)];
  if (!uniqueUserIds.length) {
    uniqueUserIds = fallbackUsers.map((user) => user._id.toString());
  }

  await Promise.all(
    uniqueUserIds.map((receiverId) =>
      sendNotification({
        receiverId,
        title: "New State Event",
        body: `${state?.name || "State"} created a new event: ${event.header}`,
        notificationType: "event",
        sentBy: stateId,
        data: {
          eventId: event._id,
          stateId,
          eventType: "State",
        },
      })
    )
  );

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

/** Same fetch as display single, but keeps populated `eventFor` for authorization. */
export const getStateEventFullDetailsByIdRepository = async (eventId) => {
  return Event.findById(eventId).populate("eventFor", "name").lean();
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
    registerStartDate: event.registerStartDate,
    registerEndDate: event.registerEndDate,
    eventStartDate: event.eventStartDate,
    eventEndDate: event.eventEndDate,
    eventStartTime: event.eventStartTime,
    eventEndTime: event.eventEndTime,
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
    .sort({ eventStartDate: 1 })
    .skip(skip)
    .limit(pageLimit)
    .lean();

  const total = await Event.countDocuments(query);

  // ✅ Format response (IMPORTANT 🔥)
  const formattedEvents = events.map((event) => ({
    id: event._id,
    header: event.header,
    image: event.image,
    registerStartDate: event.registerStartDate,
    registerEndDate: event.registerEndDate,
    eventStartDate: event.eventStartDate,
    eventEndDate: event.eventEndDate,
    eventStartTime: event.eventStartTime,
    eventEndTime: event.eventEndTime,
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

