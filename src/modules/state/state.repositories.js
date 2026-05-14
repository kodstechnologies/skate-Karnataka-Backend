import { AppError } from "../../util/common/AppError.js";
import { paginate } from "../../util/common/paginate.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import { Skater } from "../skater/skater.model.js";
import { Report } from "../report/report.model.js";
import { State } from "./state.model.js";

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

export const stateDashboardRepository = async () => {
  const [totalDistrict, totalClubs, totalSkaters, pendingApprovals, latestReport] = await Promise.all([
    District.countDocuments(),
    Club.countDocuments(),
    Skater.countDocuments(),
    Club.countDocuments({ districtStatus: "apply" }),
    Report.findOne()
      .sort({ createdAt: -1 })
      .select("_id ownClub reportType message clubName skaterName districtName krsaId status createdAt")
      .lean(),
  ]);

  return {
    totalDistrict,
    totalClubs,
    totalSkaters,
    pendingApprovals,
    latestReport: latestReport || null,
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
      .lean();
  }
  if (!skater) {
    skater = await Skater.findOne({ krsaId: raw })
      .select(`${skaterDetailSelect} club`)
      .populate("district", "name")
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
      .select(skaterDetailSelect)
      .populate("district", "name")
      .lean();
  }
  if (!skater) {
    skater = await Skater.findOne({ krsaId: raw })
      .select(skaterDetailSelect)
      .populate("district", "name")
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
  };
};
