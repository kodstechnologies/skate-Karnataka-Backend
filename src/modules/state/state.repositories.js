import { AppError } from "../../util/common/AppError.js";
import { paginate } from "../../util/common/paginate.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import { Skater } from "../skater/skater.model.js";
import { Report } from "../report/report.model.js";
import { Event } from "../event/event.model.js";
import { DisciplineService } from "../discipline/discipline.model.js";
import { State } from "./state.model.js";

const DISCIPLINE_CHART_COLORS = [
  "#f6765e",
  "#13b5b4",
  "#2fa96d",
  "#8e82ff",
  "#f2b94b",
  "#53c7c5",
];

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
};

const formatEventTime = (dateValue, timeValue) => {
  if (timeValue) return String(timeValue).trim();
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const buildSparkline = (dailyCounts) => {
  const values = dailyCounts.map((entry) => entry.count);
  const max = Math.max(...values, 1);
  return values.map((count) => Math.round((count / max) * 42) + 8);
};

const normalizeAllowedModule = (allowedModule = []) => {
  const normalized = [];

  for (const moduleValue of allowedModule) {
    if (typeof moduleValue !== "string") {
      continue;
    }

    const trimmed = moduleValue.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const parsedValue of parsed) {
            if (typeof parsedValue === "string" && parsedValue.trim()) {
              normalized.push(parsedValue.trim());
            }
          }
          continue;
        }
      } catch {
        // Keep original value when not valid JSON.
      }
    }

    normalized.push(trimmed);
  }

  return [...new Set(normalized)];
};

export const getAllStateRepository = async ({ page, limit }) => {
  const pagination = paginate(page, limit);
  const [states, total] = await Promise.all([
    State.find()
      .select("_id fullName phone email img about krsaId status allowedModule")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    State.countDocuments(),
  ]);

  return {
    states: states.map((state) => ({
      ...state,
      allowedModule: normalizeAllowedModule(state.allowedModule),
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit) || 1,
    },
  };
};

export const isStateExistByNameRepository = async (name) => {
  return State.findOne({ name }).select("_id").lean();
};

export const createStateRepository = async (payload) => {
  return State.create({
    ...payload,
    verify: true,
  });
};

export const getSingleStateWithDistrictsRepository = async (stateId) => {
  const state = await State.findById(stateId)
    .select("_id fullName phone email name img about krsaId status allowedModule")
    .lean();

  if (!state) {
    return null;
  }

  return {
    ...state,
    allowedModule: normalizeAllowedModule(state.allowedModule),
  };
};

export const updateStateRepository = async (stateId, payload) => {
  const updated = await State.findByIdAndUpdate(
    stateId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .select("_id fullName phone email name img about krsaId status")
    .lean();

  if (!updated) {
    throw new AppError("State not found", 404);
  }

  return updated;
};

export const deleteStateRepository = async (stateId) => {
  const deleted = await State.findByIdAndDelete(stateId).lean();
  if (!deleted) {
    throw new AppError("State not found", 404);
  }
  return deleted;
};

export const stateDashboardRepository = async (user) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const weekStart = startOfDay(new Date(now));
  weekStart.setDate(weekStart.getDate() - 6);

  const role = String(user?.role || "Admin");
  const normalizedRole = role.toLowerCase();

  let allowedModule = normalizeAllowedModule(user?.allowedModule);
  let greetingName = user?.fullName || "Admin";

  if (normalizedRole === "state" && user?._id) {
    const stateAccount = await State.findById(user._id)
      .select("fullName allowedModule")
      .lean();
    if (stateAccount) {
      greetingName = stateAccount.fullName || greetingName;
      allowedModule = normalizeAllowedModule(stateAccount.allowedModule);
    }
  }

  const [
    totalDistrict,
    totalClubs,
    totalSkaters,
    skatersThisMonth,
    skatersLastMonth,
    pendingApprovals,
    upcomingEventsCount,
    reportStatsRaw,
    latestReport,
    latestEvent,
    upcomingEvents,
    recentReports,
    disciplineAgg,
    skatersByDay,
    reportsByDay,
  ] = await Promise.all([
    District.countDocuments(),
    Club.countDocuments(),
    Skater.countDocuments({ isActive: { $ne: false } }),
    Skater.countDocuments({ createdAt: { $gte: monthStart }, isActive: { $ne: false } }),
    Skater.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      isActive: { $ne: false },
    }),
    Club.countDocuments({ districtStatus: "apply" }),
    Event.countDocuments({
      eventStartDate: { $gte: todayStart },
      status: { $nin: ["cancelled", "completed"] },
    }),
    Report.aggregate([
      {
        $match: {
          status: { $in: ["pending", "inprogress", "notSolved"] },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Report.findOne()
      .sort({ createdAt: -1 })
      .select(
        "_id ownClub reportType message clubName skaterName districtName krsaId status createdAt"
      )
      .lean(),
    Event.findOne()
      .sort({ createdAt: -1 })
      .select("header address eventType eventStartDate eventStartTime status createdAt")
      .lean(),
    Event.find({
      eventStartDate: { $gte: todayStart },
      status: { $nin: ["cancelled", "completed"] },
    })
      .sort({ eventStartDate: 1 })
      .limit(3)
      .select("header address eventType eventStartDate eventStartTime status")
      .lean(),
    Report.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select(
        "_id reportType message clubName skaterName districtName krsaId status createdAt"
      )
      .lean(),
    Skater.aggregate([
      { $match: { discipline: { $ne: null }, isActive: { $ne: false } } },
      { $group: { _id: "$discipline", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Skater.aggregate([
      { $match: { createdAt: { $gte: weekStart }, isActive: { $ne: false } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Report.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  let pending = 0;
  let inprogress = 0;
  let notSolved = 0;
  for (const item of reportStatsRaw) {
    if (item._id === "pending") pending = item.count;
    if (item._id === "inprogress") inprogress = item.count;
    if (item._id === "notSolved") notSolved = item.count;
  }

  const openReports = pending + inprogress + notSolved;

  const skaterGrowth = skatersThisMonth - skatersLastMonth;
  const skaterGrowthLabel =
    skaterGrowth > 0 ? `+${skaterGrowth}` : skaterGrowth < 0 ? `${skaterGrowth}` : "0";

  const disciplineIds = disciplineAgg.map((item) => item._id).filter(Boolean);
  const disciplineDocs = disciplineIds.length
    ? await DisciplineService.find({ _id: { $in: disciplineIds } })
        .select("name")
        .lean()
    : [];
  const disciplineNameById = new Map(
    disciplineDocs.map((doc) => [String(doc._id), doc.name || "Other"])
  );

  const disciplineTotal =
    disciplineAgg.reduce((sum, item) => sum + (item.count || 0), 0) || totalSkaters || 1;

  const disciplineDistribution = disciplineAgg.map((item, index) => ({
    label: disciplineNameById.get(String(item._id)) || "Other",
    value: Math.round((item.count / disciplineTotal) * 100),
    count: item.count,
    color: DISCIPLINE_CHART_COLORS[index % DISCIPLINE_CHART_COLORS.length],
  }));

  const formatDayKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const weekLabels = [];
  const skaterDaily = [];
  const reportDaily = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + offset);
    const key = formatDayKey(day);
    weekLabels.push(day.toLocaleDateString("en-IN", { weekday: "short" }));
    skaterDaily.push({
      date: key,
      count: skatersByDay.find((entry) => entry._id === key)?.count || 0,
    });
    reportDaily.push({
      date: key,
      count: reportsByDay.find((entry) => entry._id === key)?.count || 0,
    });
  }

  const recentActivity = [];

  for (const report of recentReports) {
    recentActivity.push({
      id: String(report._id),
      type: "report",
      title: `New ${report.reportType || "report"} submitted`,
      detail: `${report.skaterName || report.krsaId || "A skater"} — ${report.clubName || "club"} (${report.status || "pending"})`,
      time: formatRelativeTime(report.createdAt),
      createdAt: report.createdAt,
    });
  }

  if (latestEvent) {
    recentActivity.push({
      id: String(latestEvent._id),
      type: "event",
      title: `Event published: ${latestEvent.header || "New event"}`,
      detail: `${latestEvent.eventType || "State"} event at ${latestEvent.address || "TBA"}`,
      time: formatRelativeTime(latestEvent.createdAt),
      createdAt: latestEvent.createdAt,
    });
  }

  recentActivity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    user: {
      fullName: greetingName,
      role,
      allowedModule,
    },
    summary: {
      totalDistrict,
      totalClubs,
      totalSkaters,
      skatersThisMonth,
      skaterGrowth,
      skaterGrowthLabel,
      pendingApprovals,
      upcomingEvents: upcomingEventsCount,
      openReports,
    },
    reports: {
      pending,
      inprogress,
      notSolved,
      total: pending + inprogress + notSolved,
    },
    latestReport: latestReport || null,
    latestEvent: latestEvent || null,
    upcomingSessions: upcomingEvents.map((event) => ({
      id: String(event._id),
      title: event.header || "Upcoming event",
      subtitle: event.address || event.eventType || "Karnataka",
      time: formatEventTime(event.eventStartDate, event.eventStartTime),
      coach: event.eventType ? `${event.eventType} event` : "Scheduled",
      status: event.status || "active",
    })),
    recentActivity: recentActivity.slice(0, 5),
    disciplineDistribution,
    disciplineTotal: disciplineTotal || totalSkaters,
    weeklyOverview: {
      labels: weekLabels,
      skaterRegistrations: skaterDaily,
      reportsFiled: reportDaily,
      skaterSparkline: buildSparkline(skaterDaily),
      reportSparkline: buildSparkline(reportDaily),
    },
    stats: [
      {
        key: "registeredSkaters",
        module: "Skaters",
        label: "Registered Skaters",
        value: String(totalSkaters),
        change: skaterGrowthLabel,
        note: "new this month",
      },
      {
        key: "totalClubs",
        module: "Clubs",
        label: "Total Clubs",
        value: String(totalClubs),
        change: String(pendingApprovals),
        note: "pending district approval",
      },
      {
        key: "upcomingEvents",
        module: "Events",
        label: "Upcoming Events",
        value: String(upcomingEventsCount),
        change: latestEvent?.header ? "Latest" : "—",
        note: latestEvent?.header ? String(latestEvent.header).slice(0, 28) : "scheduled from today",
      },
      {
        key: "totalDistricts",
        module: "Districts",
        label: "Districts",
        value: String(totalDistrict),
        change: String(openReports),
        note: "open reports statewide",
      },
    ],
  };
};

export const stateProfileRepository = async (stateId) => {
  const [state, districtMedalsAgg, clubMedalsAgg] = await Promise.all([
    State.findById(stateId).select("name officialAddress img krsaId").lean(),
    District.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$championships", 0] } },
        },
      },
    ]),
    Club.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$championships", 0] } },
        },
      },
    ]),
  ]);

  if (!state) {
    throw new AppError("State not found", 404);
  }

  return {
    name: state.name || "",
    officialAddress: state.officialAddress || "",
    img: state.img || "",
    krsaId: state.krsaId || "",
    districtMedals: districtMedalsAgg?.[0]?.total || 0,
    clubMedals: clubMedalsAgg?.[0]?.total || 0,
    skaterMedals: 0,
  };
};

/** Logged-in state official / sub-admin personal profile (for /profile page). */
export const stateAccountProfileRepository = async (stateId) => {
  const profile = await State.findById(stateId)
    .select(
      "fullName phone email img gender address countryCode krsaId role allowedModule"
    )
    .lean();

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return {
    ...profile,
    img: profile.img || "",
    role: profile.role || "State",
    allowedModule: normalizeAllowedModule(profile.allowedModule),
  };
};

export const updateStateAccountProfileRepository = async (stateId, payload) => {
  const updated = await State.findByIdAndUpdate(
    stateId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .select("fullName phone email img gender address countryCode krsaId role")
    .lean();

  if (!updated) {
    throw new AppError("Profile not found", 404);
  }

  return {
    ...updated,
    img: updated.img || "",
    role: updated.role || "State",
  };
};

export const getAllDistrictsByStateRepository = async ({ page, limit, search = "" }) => {
  const pagination = paginate(page, limit);
  const term = String(search || "").trim();
  const query = term ? { name: { $regex: term, $options: "i" } } : {};

  const [data, total] = await Promise.all([
    District.find(query)
      .select("_id name img officeAddress rank championships")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    District.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit) || 1,
    },
  };
};

export const getAllClubsByStateRepository = async ({ page, limit, search = "" }) => {
  const pagination = paginate(page, limit);
  const term = String(search || "").trim();
  const query = term
    ? {
        $or: [
          { name: { $regex: term, $options: "i" } },
          { clubId: { $regex: term, $options: "i" } },
          { districtName: { $regex: term, $options: "i" } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    Club.find(query)
      .select("_id name clubId district districtName img officeAddress rank championships")
      .populate("district", "_id name")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Club.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit) || 1,
    },
  };
};

export const getAllSkatersByStateRepository = async ({ page, limit, search = "" }) => {
  const pagination = paginate(page, limit);
  const term = String(search || "").trim();
  const query = { role: "Skater" };

  if (term) {
    query.$or = [
      { fullName: { $regex: term, $options: "i" } },
      { phone: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { krsaId: { $regex: term, $options: "i" } },
    ];
  }

  const [rows, total] = await Promise.all([
    Skater.find(query)
      .select("_id fullName profile")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Skater.countDocuments(query),
  ]);

  const data = rows.map((s) => ({
    _id: s._id,
    fullName: s.fullName ?? "",
    profile: s.profile ?? "",
  }));

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit) || 1,
    },
  };
};

const skaterDetailSelect =
  "fullName profile phone address district gender email krsaId";

const looksLikeMongoObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveClubLeanByParam = async (clubIdParam, select) => {
  const raw = String(clubIdParam || "").trim();
  if (!raw) {
    return null;
  }

  const sel =
    select ||
    "_id clubId name img officeAddress about districtName rank championships district";

  let club = null;
  if (looksLikeMongoObjectId(raw)) {
    club = await Club.findById(raw)
      .select(sel)
      .populate("district", "_id name")
      .lean();
  }
  if (!club) {
    club = await Club.findOne({ clubId: raw })
      .select(sel)
      .populate("district", "_id name")
      .lean();
  }
  return club;
};

export const getClubDetailByIdForStateRepository = async (clubIdParam) => {
  const club = await resolveClubLeanByParam(
    clubIdParam,
    "_id clubId name img officeAddress about districtName rank championships district"
  );
  if (!club) {
    return null;
  }

  const totalSkaters = await Skater.countDocuments({ club: club._id });

  return {
    district: {
      _id: club.district?._id ?? null,
      name: club.district?.name ?? "",
    },
    clubId: club.clubId || String(club._id),
    name: club.name || "",
    img: club.img || "",
    officeAddress: club.officeAddress || "",
    about: club.about || "",
    districtName: club.districtName || "",
    rank: club.rank || 0,
    championships: club.championships || 0,
    totalSkaterCount: totalSkaters,
  };
};

export const getClubSkatersByClubIdForStateRepository = async (
  clubIdParam,
  { page, limit, search }
) => {
  const club = await resolveClubLeanByParam(clubIdParam, "_id name");
  if (!club) {
    return null;
  }

  const pagination = paginate(page, limit);
  const term = String(search || "").trim();
  const filter = { club: club._id, role: "Skater" };

  if (term) {
    filter.fullName = { $regex: escapeRegExp(term), $options: "i" };
  }

  const [total, data] = await Promise.all([
    Skater.countDocuments(filter),
    Skater.find(filter)
      .select("_id fullName photo club")
      .populate("club", "_id name")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
  ]);

  return {
    club: {
      _id: club._id,
      name: club.name || "",
    },
    data: data.map((skater) => ({
      _id: skater._id,
      name: skater.fullName || "",
      img: skater.photo || "",
      club: {
        _id: skater.club?._id || null,
        name: skater.club?.name || "",
      },
    })),
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit) || 1,
    },
  };
};

export const getClubSkaterByIdsForStateRepository = async (clubIdParam, skaterIdParam) => {
  const club = await resolveClubLeanByParam(clubIdParam, "_id");
  if (!club) {
    return null;
  }

  const raw = String(skaterIdParam || "").trim();
  if (!raw) {
    return null;
  }

  let skater = null;
  if (looksLikeMongoObjectId(raw)) {
    skater = await Skater.findById(raw)
      .select(`${skaterDetailSelect} club`)
      .populate("district", "name")
      .populate("club", "name clubId")
      .lean();
  }
  if (!skater) {
    skater = await Skater.findOne({ krsaId: raw })
      .select(`${skaterDetailSelect} club`)
      .populate("district", "name")
      .populate("club", "name clubId")
      .lean();
  }

  if (!skater || String(skater.club) !== String(club._id)) {
    return null;
  }

  return {
    fullName: skater.fullName ?? "",
    profile: skater.profile ?? "",
    phone: skater.phone ?? "",
    address: skater.address ?? "",
    districtName: skater.district?.name ?? "",
    gender: skater.gender ?? "",
    email: skater.email ?? "",
    krsaId: skater.krsaId ?? "",
    rank: 0,
    clubName: skater.club?.name ?? "",
  };
};

export const getSkaterByIdForStateRepository = async (id) => {
  const raw = String(id || "").trim();
  if (!raw) {
    return null;
  }

  let skater = null;
  if (looksLikeMongoObjectId(raw)) {
    skater = await Skater.findById(raw)
      .select(`${skaterDetailSelect} club`)
      .populate("district", "name")
      .populate("club", "name clubId")
      .lean();
  }
  if (!skater) {
    skater = await Skater.findOne({ krsaId: raw })
      .select(`${skaterDetailSelect} club`)
      .populate("district", "name")
      .populate("club", "name clubId")
      .lean();
  }

  if (!skater) {
    return null;
  }

  return {
    fullName: skater.fullName ?? "",
    profile: skater.profile ?? "",
    phone: skater.phone ?? "",
    address: skater.address ?? "",
    districtName: skater.district?.name ?? "",
    gender: skater.gender ?? "",
    email: skater.email ?? "",
    krsaId: skater.krsaId ?? "",
    rank: 0,
    clubName: skater.club?.name ?? "",
  };
};
