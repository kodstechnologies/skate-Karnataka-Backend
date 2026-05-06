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
