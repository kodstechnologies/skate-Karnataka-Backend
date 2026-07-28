import { BaseAuth } from "../auth/baseAuth.model.js";
import { EventCompetition } from "../competition/eventCompetition.model.js";
import { syncEventCompetitionFromParticipants, assertChestNumbersGeneratedForEvent } from "../competition/skaterChestNo.service.js";
import {
  DEFAULT_ROUND_KEYS,
  buildCategoriesForAgeGroup,
  collectAgeGroupLabels,
  competitionCategoryNamesEqual,
  filterCompetitorsByGender,
  filterCompetitionCategoryByGender,
  findEventCategoryByQuery,
  findEventCategoryMeta,
  formatCategoryRoundDisplay,
  normalizeCompetitionGenderFilter,
  normalizeSkaterGenderValue,
  scopeResolvedSkatingCategories,
  toCompetitionGenderLabel,
} from "../competition/displayRound.util.js";
import { getEventSkatingEventCategoriesFullRepository } from "./event.repositories.js";
import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta } from "../../util/common/paginate.js";
import {
  formatCompetitionTimeDisplay,
  normalizeCompetitionTimeForStorage,
  parseCompetitionTimeTakenToSeconds,
} from "../../util/time/timeUtil.js";

const MANUAL_ROUND_ALIASES = {
  "1": "1stRound",
  "1st": "1stRound",
  first: "1stRound",
  "1stround": "1stRound",
  "2": "2ndRound",
  "2nd": "2ndRound",
  second: "2ndRound",
  "2ndround": "2ndRound",
  "3": "semiFinal",
  semi: "semiFinal",
  semifinal: "semiFinal",
  "4": "final",
  final: "final",
};

const NEXT_MANUAL_ROUND = {
  "1stRound": "2ndRound",
  "2ndRound": "semiFinal",
  semiFinal: "final",
  final: "winners",
};

const MEDAL_ROUNDS = ["1st", "2nd", "3rd"];

const normalizeManualRound = (raw, { defaultRound = "1stRound" } = {}) => {
  const value = String(raw ?? "").trim();
  if (!value) {
    return defaultRound;
  }
  const aliased = MANUAL_ROUND_ALIASES[value.toLowerCase()];
  if (aliased) {
    return aliased;
  }
  if (DEFAULT_ROUND_KEYS.includes(value)) {
    return value;
  }
  throw new AppError(
    `round must be one of: 1 / 1stRound, 2 / 2ndRound, semiFinal, final (got "${value}")`,
    400
  );
};

const normalizeOptionalNextRound = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return null;
  }
  const round = normalizeManualRound(raw, { defaultRound: null });
  if (!round || round === "1stRound") {
    throw new AppError(
      "nextRound must be one of: 2ndRound, semiFinal, final",
      400
    );
  }
  return round;
};

const hasNonEmptyTime = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const hasProvidedPosition = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const normalizeCompetitionPosition = (value) => {
  const raw = String(value ?? "").trim();
  return raw === "1" || raw === "2" || raw === "3" ? raw : "0";
};

const getSecondsFromTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return Infinity;
  const trimmed = timeStr.trim();
  if (!trimmed) return Infinity;
  try {
    const seconds = parseCompetitionTimeTakenToSeconds(trimmed);
    return seconds == null ? Infinity : seconds;
  } catch {
    const parsed = parseFloat(trimmed);
    return Number.isNaN(parsed) ? Infinity : parsed;
  }
};

const mapCompetitor = (row) => ({
  skaterId: row?.skaterId,
  chestNo: row?.chestNo || "",
  fullName: row?.fullName || "",
  krsaId: row?.krsaId || "",
  rsfiId: row?.rsfiId || "",
  time: formatCompetitionTimeDisplay(row?.time),
  position: row?.position || "0",
});

const mapCompetitorForMedal = (source, medalPosition) => ({
  skaterId: source?.skaterId,
  chestNo: String(source?.chestNo || ""),
  fullName: String(source?.fullName || ""),
  krsaId: String(source?.krsaId || ""),
  rsfiId: String(source?.rsfiId || ""),
  time: formatCompetitionTimeDisplay(source?.time),
  position: normalizeCompetitionPosition(medalPosition),
});

const cloneCompetitorForNextRound = (source) => ({
  skaterId: source?.skaterId,
  chestNo: String(source?.chestNo || ""),
  fullName: String(source?.fullName || ""),
  krsaId: String(source?.krsaId || ""),
  rsfiId: String(source?.rsfiId || ""),
  time: "",
  position: "0",
});

const toPlainCompetitorRow = (row) =>
  row && typeof row.toObject === "function" ? row.toObject() : row;

const setCategoryRound = (category, roundKey, rows) => {
  if (typeof category.set === "function") {
    category.set(roundKey, rows);
    return;
  }
  category[roundKey] = rows;
};

const mergeRoundRowsByGender = (
  existingRows,
  incomingRows,
  genderBySkaterId,
  genderFilter
) => {
  if (!genderFilter) {
    return incomingRows;
  }
  const kept = (existingRows || []).filter(
    (row) => genderBySkaterId.get(String(row?.skaterId || "")) !== genderFilter
  );
  return [...kept, ...(incomingRows || [])];
};

const clearSubsequentRoundsInCategoryByGender = (
  category,
  updatedRound,
  genderBySkaterId,
  genderFilter
) => {
  const roundIndex = DEFAULT_ROUND_KEYS.indexOf(updatedRound);
  if (roundIndex < 0) {
    return;
  }

  const subsequentRounds = DEFAULT_ROUND_KEYS.slice(roundIndex + 1);
  for (const nextRound of subsequentRounds) {
    setCategoryRound(
      category,
      nextRound,
      mergeRoundRowsByGender(
        category[nextRound],
        [],
        genderBySkaterId,
        genderFilter
      )
    );
  }

  for (const medalRound of MEDAL_ROUNDS) {
    setCategoryRound(
      category,
      medalRound,
      mergeRoundRowsByGender(
        category[medalRound],
        [],
        genderBySkaterId,
        genderFilter
      )
    );
  }
};

const loadGenderBySkaterId = async (competitions = []) => {
  const ids = new Set();
  for (const competition of competitions) {
    for (const category of competition?.categories || []) {
      for (const key of [...DEFAULT_ROUND_KEYS, ...MEDAL_ROUNDS]) {
        for (const row of category?.[key] || []) {
          if (row?.skaterId) {
            ids.add(String(row.skaterId));
          }
        }
      }
    }
  }

  if (!ids.size) {
    return new Map();
  }

  const users = await BaseAuth.find({ _id: { $in: [...ids] } })
    .select("_id gender")
    .lean();

  return new Map(
    users.map((user) => [
      String(user._id),
      normalizeSkaterGenderValue(user.gender),
    ])
  );
};

const loadCompetitionOrSync = async (eventId, ageGroup) => {
  let competition = await EventCompetition.findOne({ eventId, ageGroup });
  if (!competition) {
    await syncEventCompetitionFromParticipants(eventId, { ageGroup });
    competition = await EventCompetition.findOne({ eventId, ageGroup });
  }
  if (!competition) {
    throw new AppError(
      "No competition found for the given event and age group",
      404
    );
  }
  return competition;
};

const findCategoryOrThrow = (competition, name) => {
  const category = (competition.categories || []).find((row) =>
    competitionCategoryNamesEqual(row.name, name)
  );
  if (!category) {
    throw new AppError(
      `Category "${name}" not found for age group ${competition.ageGroup}`,
      404
    );
  }
  return category;
};

/**
 * Sort competitors for manual display.
 * - position: rank by position (1→n), missing last
 * - time: fastest → slowest, missing last
 * - position_then_time (legacy): position first, then time
 */
export const sortManualCompetitors = (rows = [], type = "position_then_time") => {
  const list = Array.isArray(rows) ? [...rows] : [];
  const mode = String(type || "position_then_time").trim().toLowerCase();

  if (mode === "time") {
    return list.sort((a, b) => {
      const timeA = getSecondsFromTime(String(a?.time || ""));
      const timeB = getSecondsFromTime(String(b?.time || ""));
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
    });
  }

  if (mode === "position") {
    return list.sort((a, b) => {
      const posA = Number(String(a?.position ?? "").trim());
      const posB = Number(String(b?.position ?? "").trim());
      const hasPosA = Number.isInteger(posA) && posA >= 1;
      const hasPosB = Number.isInteger(posB) && posB >= 1;

      if (hasPosA && hasPosB && posA !== posB) {
        return posA - posB;
      }
      if (hasPosA && !hasPosB) {
        return -1;
      }
      if (!hasPosA && hasPosB) {
        return 1;
      }
      return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
    });
  }

  // position_then_time
  return list.sort((a, b) => {
    const posA = Number(String(a?.position ?? "").trim());
    const posB = Number(String(b?.position ?? "").trim());
    const hasPosA = Number.isInteger(posA) && posA >= 1 && posA <= 3;
    const hasPosB = Number.isInteger(posB) && posB >= 1 && posB <= 3;

    if (hasPosA && hasPosB && posA !== posB) {
      return posA - posB;
    }
    if (hasPosA && !hasPosB) {
      return -1;
    }
    if (!hasPosA && hasPosB) {
      return 1;
    }

    const timeA = getSecondsFromTime(String(a?.time || ""));
    const timeB = getSecondsFromTime(String(b?.time || ""));
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
  });
};

const normalizeManualResultType = (raw) => {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "position" || value === "time" ? value : null;
};

const getCategoryResultType = (category, genderKey, roundKey) => {
  const store =
    category?.resultType && typeof category.resultType === "object"
      ? category.resultType
      : {};
  const plain =
    store && typeof store.toObject === "function" ? store.toObject() : store;
  const genderBucket = plain?.[genderKey] || plain?.all || {};
  return normalizeManualResultType(genderBucket?.[roundKey]);
};

const setCategoryResultType = (category, genderKey, roundKey, type) => {
  const existing =
    category?.resultType && typeof category.resultType === "object"
      ? category.resultType
      : {};
  const plain =
    existing && typeof existing.toObject === "function"
      ? existing.toObject()
      : { ...existing };
  const next = {
    ...plain,
    [genderKey]: {
      ...(plain[genderKey] || {}),
      [roundKey]: type,
    },
  };
  if (typeof category.set === "function") {
    category.set("resultType", next);
  } else {
    category.resultType = next;
  }
};

/**
 * Update competitor time/position.
 * If both are omitted → reset to empty defaults (time "", position "0").
 * If a field is sent (including ""), that field is written; the other is left as-is.
 * When resultType is set, only that field is applied.
 */
const applyCompetitorResultUpdate = (competitor, { time, position }, resultType = null) => {
  if (resultType === "position") {
    competitor.position = normalizeCompetitionPosition(position);
    return;
  }
  if (resultType === "time") {
    competitor.time = hasNonEmptyTime(time)
      ? normalizeCompetitionTimeForStorage(time)
      : "";
    return;
  }

  const timeOmitted = time === undefined;
  const positionOmitted = position === undefined;

  if (timeOmitted && positionOmitted) {
    competitor.time = "";
    competitor.position = "0";
    return;
  }

  if (!timeOmitted) {
    competitor.time = hasNonEmptyTime(time)
      ? normalizeCompetitionTimeForStorage(time)
      : "";
  }

  if (!positionOmitted) {
    competitor.position = normalizeCompetitionPosition(position);
  }
};

const MANUAL_ROUND_DISPLAY_NAME = {
  "1stRound": "1st Round",
  "2ndRound": "2nd Round",
  semiFinal: "Semi Final",
  final: "Final Round",
};

const toManualRoundDisplayRow = (row) => ({
  ...row,
  roundName: MANUAL_ROUND_DISPLAY_NAME[row?.round] || row?.round || null,
});

/**
 * Manual rounds display — no formula / unlock rules.
 * Only rounds with skaters (count > 0) are returned.
 */
const toManualCategoryDisplay = (formatted) => {
  const hasPodium = Boolean(
    formatted?.["1st"] || formatted?.["2nd"] || formatted?.["3rd"]
  );

  const roundsByKey = new Map(
    (Array.isArray(formatted?.rounds) ? formatted.rounds : []).map((row) => [
      row.round,
      row,
    ])
  );

  const populatedRounds = DEFAULT_ROUND_KEYS.map((key) => {
    const existing = roundsByKey.get(key);
    return {
      round: key,
      status: Boolean(existing?.status),
      count: Number(existing?.count) || 0,
    };
  }).filter((row) => row.count > 0);

  let lastWithData = null;
  for (const row of populatedRounds) {
    lastWithData = row.round;
  }

  let activeRound;
  if (!lastWithData) {
    activeRound = "1stRound";
  } else if (lastWithData === "final" && hasPodium) {
    activeRound = null;
  } else {
    activeRound = lastWithData;
  }

  return {
    name: formatted.name,
    categoryId: formatted.categoryId ? String(formatted.categoryId) : null,
    activeRound,
    rounds: populatedRounds.map(toManualRoundDisplayRow),
    "1st": Boolean(formatted?.["1st"]),
    "2nd": Boolean(formatted?.["2nd"]),
    "3rd": Boolean(formatted?.["3rd"]),
  };
};

/**
 * GET manual-rounds — formula-free, no unlock rules.
 * Only rounds with count > 0 are listed; promote any chestNos freely.
 * Supports categoryId (lap or SkatingEventCategory id) to resolve the category.
 */
export const getManualRoundsService = async ({
  eventId,
  ageGroup,
  name,
  categoryId,
  skatingEventCategoryId,
  categoriesId,
  gender: genderQuery,
}) => {
  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const genderFilter = normalizeCompetitionGenderFilter(genderQuery);
  const genderLabel = toCompetitionGenderLabel(genderQuery);
  const resolvedCategories = eventMeta.skatingEventCategories || [];

  const skatingCategoryScopeId =
    skatingEventCategoryId || categoriesId || null;
  const scopedCategories = scopeResolvedSkatingCategories(
    resolvedCategories,
    skatingCategoryScopeId
  );

  if (skatingCategoryScopeId && !scopedCategories.length) {
    throw new AppError("Skating event category not linked to this event", 404);
  }

  const competitions = await EventCompetition.find({ eventId }).lean();
  const genderBySkaterId = genderFilter
    ? await loadGenderBySkaterId(competitions)
    : new Map();
  const competitionByAge = new Map(
    competitions.map((row) => [String(row.ageGroup || "").trim(), row])
  );

  const applyGender = (categoryDoc) =>
    filterCompetitionCategoryByGender(
      categoryDoc,
      genderBySkaterId,
      genderFilter
    );

  const resolvedCategoryId = categoryId ? String(categoryId).trim() : "";
  const categoryNameQuery = name ? String(name).trim() : "";
  const ageGroupQuery = ageGroup ? String(ageGroup).trim() : "";

  const wantsSingleCategory = Boolean(
    resolvedCategoryId || (ageGroupQuery && categoryNameQuery)
  );

  if (wantsSingleCategory) {
    let meta = findEventCategoryByQuery(scopedCategories, {
      ageGroup: ageGroupQuery || undefined,
      categoryId: resolvedCategoryId || undefined,
      categoriesId: skatingCategoryScopeId || undefined,
      skatingEventCategoryId: skatingCategoryScopeId || undefined,
      name: categoryNameQuery || undefined,
    });

    if (!meta && categoryNameQuery && ageGroupQuery) {
      meta = findEventCategoryMeta(
        scopedCategories,
        ageGroupQuery,
        categoryNameQuery
      );
    }

    const resolvedAgeGroup = ageGroupQuery || null;
    const competition = resolvedAgeGroup
      ? competitionByAge.get(resolvedAgeGroup) || null
      : null;

    const resolvedName = meta?.name || categoryNameQuery;
    if (!resolvedName) {
      throw new AppError("Category not found for this event", 404);
    }

    // If categoryId resolved a lap but ageGroup was omitted, find competition by scanning.
    let competitionCategory = null;
    let matchedAgeGroup = resolvedAgeGroup;

    if (competition) {
      competitionCategory = (competition.categories || []).find((row) =>
        competitionCategoryNamesEqual(row.name, resolvedName)
      );
    } else {
      for (const [label, comp] of competitionByAge.entries()) {
        const found = (comp.categories || []).find((row) =>
          competitionCategoryNamesEqual(row.name, resolvedName)
        );
        if (found) {
          competitionCategory = found;
          matchedAgeGroup = label;
          break;
        }
      }
    }

    if (!competitionCategory && !meta) {
      throw new AppError("Category not found for this event and age group", 404);
    }

    // If categoryId was a SkatingEventCategory parent id + ageGroup, prefer matching id on meta
    if (
      resolvedCategoryId &&
      meta?.categoryId &&
      String(meta.categoryId) !== resolvedCategoryId &&
      String(meta.skatingEventCategoryId) !== resolvedCategoryId
    ) {
      throw new AppError("Category id does not match this event category", 404);
    }

    const metaFields = meta
      ? {
          skatingEventCategoryId: String(meta.skatingEventCategoryId),
          skatingEventCategoryName: meta.skatingEventCategoryName,
          categoryId: String(meta.categoryId),
        }
      : resolvedCategoryId
        ? { categoryId: resolvedCategoryId }
        : {};

    const category = toManualCategoryDisplay(
      formatCategoryRoundDisplay(
        applyGender(competitionCategory || { name: resolvedName }),
        null, // manual: fixed default rounds only — not formula extras
        metaFields
      )
    );
    category.name = resolvedName;
    if (!category.categoryId) {
      category.categoryId = meta?.categoryId
        ? String(meta.categoryId)
        : resolvedCategoryId || null;
    }

    return {
      eventId,
      ageGroup: matchedAgeGroup || ageGroupQuery || null,
      gender: genderLabel,
      round: category.activeRound,
      category,
    };
  }

  if (ageGroupQuery) {
    const competition = competitionByAge.get(ageGroupQuery) || null;
    let categories = buildCategoriesForAgeGroup({
      ageGroup: ageGroupQuery,
      resolvedCategories: scopedCategories,
      competition: competition
        ? {
            ...competition,
            categories: (competition.categories || []).map(applyGender),
          }
        : null,
    }).map(toManualCategoryDisplay);

    // Optional parent SkatingEventCategory filter already applied via scopedCategories.
    // If categoryId is parent id only (no name), categories list is already scoped.

    if (!categories.length) {
      throw new AppError("No categories configured for this age group", 404);
    }

    return {
      eventId,
      ageGroup: ageGroupQuery,
      gender: genderLabel,
      categories,
    };
  }

  const ageGroupLabels = collectAgeGroupLabels(scopedCategories, competitions);
  const ageGroups = ageGroupLabels.map((label) => {
    const competition = competitionByAge.get(label) || null;
    return {
      ageGroup: label,
      categories: buildCategoriesForAgeGroup({
        ageGroup: label,
        resolvedCategories: scopedCategories,
        competition: competition
          ? {
              ...competition,
              categories: (competition.categories || []).map(applyGender),
            }
          : null,
      }).map(toManualCategoryDisplay),
    };
  });

  return {
    eventId,
    gender: genderLabel,
    ageGroups,
  };
};

/**
 * GET manual-rounds-all-skater — boys | girls | both.
 * Supports page/limit pagination and search on chestNo, fullName, krsaId, rsfiId.
 */
export const getManualRoundsAllSkaterService = async ({
  eventId,
  ageGroup,
  name,
  categoryId,
  skatingEventCategoryId,
  categoriesId,
  round: roundRaw,
  gender: genderQuery,
  page,
  limit,
  search,
  sortBy,
}) => {
  await assertChestNumbersGeneratedForEvent(eventId);

  const round = normalizeManualRound(roundRaw, { defaultRound: "1stRound" });
  const genderFilter = normalizeCompetitionGenderFilter(genderQuery);
  const genderLabel = toCompetitionGenderLabel(genderQuery);
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const searchTerm = String(search || "").trim().toLowerCase();

  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const skatingCategoryScopeId =
    skatingEventCategoryId || categoriesId || null;
  const scopedCategories = scopeResolvedSkatingCategories(
    eventMeta.skatingEventCategories || [],
    skatingCategoryScopeId
  );

  let meta = findEventCategoryByQuery(scopedCategories, {
    ageGroup,
    categoryId,
    categoriesId: skatingCategoryScopeId || undefined,
    skatingEventCategoryId: skatingCategoryScopeId || undefined,
    name,
  });

  if (!meta && name && ageGroup) {
    meta = findEventCategoryMeta(scopedCategories, ageGroup, name);
  }

  if (
    categoryId &&
    meta?.categoryId &&
    String(meta.categoryId) !== String(categoryId) &&
    String(meta.skatingEventCategoryId) !== String(categoryId)
  ) {
    throw new AppError("Category id does not match this event category", 404);
  }

  const resolvedName = meta?.name || name;
  const resolvedCategoryId = meta?.categoryId
    ? String(meta.categoryId)
    : categoryId
      ? String(categoryId)
      : null;

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const category = findCategoryOrThrow(competition, resolvedName);
  const genderBySkaterId = await loadGenderBySkaterId([competition]);

  let skaters = filterCompetitorsByGender(
    (category[round] || []).map(toPlainCompetitorRow),
    genderBySkaterId,
    genderFilter
  ).map(mapCompetitor);

  if (searchTerm) {
    skaters = skaters.filter((row) => {
      const chestNo = String(row.chestNo || "").toLowerCase();
      const fullName = String(row.fullName || "").toLowerCase();
      const krsaId = String(row.krsaId || "").toLowerCase();
      const rsfiId = String(row.rsfiId || "").toLowerCase();
      return (
        chestNo.includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        krsaId.includes(searchTerm) ||
        rsfiId.includes(searchTerm)
      );
    });
  }

  if (sortBy === "position" || sortBy === "time" || sortBy === "position_then_time") {
    skaters = sortManualCompetitors(skaters, sortBy);
  }

  const total = skaters.length;
  const skip = (pageNum - 1) * limitNum;
  const pagedSkaters = skaters.slice(skip, skip + limitNum);

  return {
    eventId,
    ageGroup,
    name: category.name,
    categoryId: resolvedCategoryId,
    round,
    gender: genderLabel,
    search: searchTerm || "",
    ...(sortBy
      ? {
          type:
            sortBy === "position" || sortBy === "time"
              ? sortBy
              : undefined,
          sortBy,
        }
      : {}),
    skaters: pagedSkaters,
    pagination: buildPaginationMeta({
      total,
      page: pageNum,
      limit: limitNum,
    }),
  };
};

/**
 * PATCH manual-update-skater-result — update time and/or position.
 * categoryId is required and used to resolve the lap/category.
 */
export const updateManualSkaterResultService = async (body) => {
  const {
    eventId,
    ageGroup,
    name,
    categoryId,
    skatingEventCategoryId,
    categoriesId,
    skaterId,
    time,
    position,
    competitors,
  } = body;
  const round = normalizeManualRound(body.round, { defaultRound: "1stRound" });
  const genderFilter = normalizeCompetitionGenderFilter(body.gender);
  const genderLabel = toCompetitionGenderLabel(body.gender);
  const resultType = normalizeManualResultType(body.type);

  if (!resultType) {
    throw new AppError('type is required ("position" or "time")', 400);
  }

  if (!categoryId) {
    throw new AppError("categoryId is required", 400);
  }

  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const skatingCategoryScopeId =
    skatingEventCategoryId || categoriesId || null;
  const scopedCategories = scopeResolvedSkatingCategories(
    eventMeta.skatingEventCategories || [],
    skatingCategoryScopeId
  );

  let meta = findEventCategoryByQuery(scopedCategories, {
    ageGroup,
    categoryId,
    categoriesId: skatingCategoryScopeId || undefined,
    skatingEventCategoryId: skatingCategoryScopeId || undefined,
    name: name || undefined,
  });

  if (!meta && name && ageGroup) {
    meta = findEventCategoryMeta(scopedCategories, ageGroup, name);
  }

  if (!meta) {
    throw new AppError("Category not found for this event and categoryId", 404);
  }

  if (
    String(meta.categoryId) !== String(categoryId) &&
    String(meta.skatingEventCategoryId) !== String(categoryId)
  ) {
    throw new AppError("Category id does not match this event category", 404);
  }

  const resolvedName = meta.name || name;
  const resolvedCategoryId = meta.categoryId
    ? String(meta.categoryId)
    : String(categoryId);

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const genderBySkaterId = genderFilter
    ? await loadGenderBySkaterId([competition])
    : new Map();

  const assertSkaterMatchesGender = (id) => {
    if (!genderFilter) return;
    const skaterGender = normalizeSkaterGenderValue(
      genderBySkaterId.get(String(id))
    );
    // Missing / unknown gender: allow (skater is already in this competition round)
    if (!skaterGender) {
      return;
    }
    if (skaterGender !== genderFilter) {
      throw new AppError(
        `Skater does not match gender filter "${genderLabel}"`,
        400
      );
    }
  };

  const updates = Array.isArray(competitors) && competitors.length
    ? competitors
    : skaterId
      ? [{ skaterId, time, position }]
      : [];

  if (!updates.length) {
    throw new AppError(
      "Provide competitors[] or skaterId with time/position",
      400
    );
  }

  const targetCategory = findCategoryOrThrow(competition, resolvedName);
  const touchedCategories = new Map();
  const resultTypeGenderKey = genderFilter || "all";

  for (const update of updates) {
    assertSkaterMatchesGender(update.skaterId);

    const competitor = (targetCategory[round] || []).find(
      (row) => String(row.skaterId) === String(update.skaterId)
    );

    if (!competitor) {
      throw new AppError(
        `Skater ${update.skaterId} not found in ${round}`,
        404
      );
    }

    applyCompetitorResultUpdate(competitor, update, resultType);
    clearSubsequentRoundsInCategoryByGender(
      targetCategory,
      round,
      genderBySkaterId,
      genderFilter
    );
    touchedCategories.set(String(targetCategory.name), targetCategory);
  }

  setCategoryResultType(targetCategory, resultTypeGenderKey, round, resultType);
  competition.markModified("categories");
  await competition.save();

  const responseCategories = [...touchedCategories.values()].map((category) => ({
    name: category.name,
    categoryId: resolvedCategoryId,
    competitors: filterCompetitorsByGender(
      category[round] || [],
      genderBySkaterId,
      genderFilter
    ).map(mapCompetitor),
  }));

  return {
    eventId: competition.eventId,
    ageGroup: competition.ageGroup,
    name: resolvedName,
    categoryId: resolvedCategoryId,
    round,
    gender: genderLabel,
    type: resultType,
    categories: responseCategories,
  };
};

/**
 * GET manual-display-sortby — sort by the type saved on manual-update-skater-result
 * ("position" or "time"). Falls back to position_then_time when none saved.
 */
export const getManualDisplaySortByService = async (query) => {
  const round = normalizeManualRound(query.round, { defaultRound: "1stRound" });
  const genderFilter = normalizeCompetitionGenderFilter(query.gender);

  const competition = await loadCompetitionOrSync(query.eventId, query.ageGroup);
  const eventMeta = await getEventSkatingEventCategoriesFullRepository(
    query.eventId
  );
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const skatingCategoryScopeId =
    query.skatingEventCategoryId || query.categoriesId || null;
  const scopedCategories = scopeResolvedSkatingCategories(
    eventMeta.skatingEventCategories || [],
    skatingCategoryScopeId
  );

  let meta = findEventCategoryByQuery(scopedCategories, {
    ageGroup: query.ageGroup,
    categoryId: query.categoryId,
    categoriesId: skatingCategoryScopeId || undefined,
    skatingEventCategoryId: skatingCategoryScopeId || undefined,
    name: query.name,
  });
  if (!meta && query.name && query.ageGroup) {
    meta = findEventCategoryMeta(scopedCategories, query.ageGroup, query.name);
  }

  const resolvedName = meta?.name || query.name;
  const category = findCategoryOrThrow(competition, resolvedName);
  const storedType =
    getCategoryResultType(category, genderFilter || "all", round) ||
    "position_then_time";

  return getManualRoundsAllSkaterService({
    ...query,
    sortBy: storedType,
  });
};

/**
 * PATCH manual-update-to-next-round
 * - round final → nextRound ignored; rename last populated round to Final Round, then set 1st/2nd/3rd by time (else position)
 * - else promote skaters whose chestNos are passed
 * - categoryId required
 */
export const updateManualToNextRoundService = async (body) => {
  const {
    eventId,
    ageGroup,
    name,
    categoryId,
    skatingEventCategoryId,
    categoriesId,
    chestNos,
  } = body;
  const round = normalizeManualRound(body.round, { defaultRound: "1stRound" });
  // When current round is final, nextRound is ignored — always submit 1st/2nd/3rd.
  const optionalNextRound =
    round === "final"
      ? null
      : normalizeOptionalNextRound(body.nextRound);
  const genderFilter = normalizeCompetitionGenderFilter(body.gender);
  const genderLabel = toCompetitionGenderLabel(body.gender);

  if (!categoryId) {
    throw new AppError("categoryId is required", 400);
  }

  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    throw new AppError("Event not found", 404);
  }

  const skatingCategoryScopeId =
    skatingEventCategoryId || categoriesId || null;
  const scopedCategories = scopeResolvedSkatingCategories(
    eventMeta.skatingEventCategories || [],
    skatingCategoryScopeId
  );

  let meta = findEventCategoryByQuery(scopedCategories, {
    ageGroup,
    categoryId,
    categoriesId: skatingCategoryScopeId || undefined,
    skatingEventCategoryId: skatingCategoryScopeId || undefined,
    name: name || undefined,
  });

  if (!meta && name && ageGroup) {
    meta = findEventCategoryMeta(scopedCategories, ageGroup, name);
  }

  if (!meta) {
    throw new AppError("Category not found for this event and categoryId", 404);
  }

  if (
    String(meta.categoryId) !== String(categoryId) &&
    String(meta.skatingEventCategoryId) !== String(categoryId)
  ) {
    throw new AppError("Category id does not match this event category", 404);
  }

  const resolvedName = meta.name || name;
  const resolvedCategoryId = meta.categoryId
    ? String(meta.categoryId)
    : String(categoryId);

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const category = findCategoryOrThrow(competition, resolvedName);
  const genderBySkaterId = await loadGenderBySkaterId([competition]);

  const getGenderRoundRows = (roundKey) =>
    filterCompetitorsByGender(
      (category[roundKey] || []).map(toPlainCompetitorRow),
      genderBySkaterId,
      genderFilter
    );

  const findLastPopulatedRound = () => {
    for (let i = DEFAULT_ROUND_KEYS.length - 1; i >= 0; i -= 1) {
      const key = DEFAULT_ROUND_KEYS[i];
      if (getGenderRoundRows(key).length) {
        return key;
      }
    }
    return null;
  };

  // Final + empty nextRound → last populated round becomes Final Round, then 1st/2nd/3rd.
  const isFinalResultSubmit = round === "final" && !optionalNextRound;
  let sourceRound = round;
  let currentRoundData = [];

  if (isFinalResultSubmit) {
    const lastRound = findLastPopulatedRound();
    if (!lastRound) {
      throw new AppError(
        genderFilter
          ? `No ${genderLabel} skaters found to submit as Final Round for "${resolvedName}"`
          : `No skaters found to submit as Final Round for "${resolvedName}"`,
        400
      );
    }
    sourceRound = lastRound;
    currentRoundData = getGenderRoundRows(sourceRound);

    // Rename last populated round → final (keep time/position). Keep earlier rounds as-is (no formula clear rules).
    if (sourceRound !== "final") {
      setCategoryRound(
        category,
        "final",
        mergeRoundRowsByGender(
          category["final"],
          currentRoundData,
          genderBySkaterId,
          genderFilter
        )
      );
      setCategoryRound(
        category,
        sourceRound,
        mergeRoundRowsByGender(
          category[sourceRound],
          [],
          genderBySkaterId,
          genderFilter
        )
      );
      currentRoundData = getGenderRoundRows("final");
    }
  } else {
    currentRoundData = getGenderRoundRows(round);
  }

  if (!currentRoundData.length) {
    throw new AppError(
      genderFilter
        ? `No ${genderLabel} skaters in ${isFinalResultSubmit ? "Final Round" : round} for "${resolvedName}"`
        : `No skaters in ${isFinalResultSubmit ? "Final Round" : round} for "${resolvedName}"`,
      400
    );
  }

  const defaultNext = NEXT_MANUAL_ROUND[round];
  const targetRound = isFinalResultSubmit
    ? "winners"
    : optionalNextRound || defaultNext;

  if (!targetRound) {
    throw new AppError(`Cannot promote from round "${round}"`, 400);
  }

  if (optionalNextRound && round !== "final") {
    const fromIdx = DEFAULT_ROUND_KEYS.indexOf(round);
    const toIdx = DEFAULT_ROUND_KEYS.indexOf(optionalNextRound);
    if (toIdx <= fromIdx) {
      throw new AppError(
        `nextRound "${optionalNextRound}" must be after current round "${round}"`,
        400
      );
    }
  }

  const normalizeChest = (value) => String(value ?? "").trim();

  /** Match "004" with "4" / "004" / 4 */
  const buildChestLookup = (rows) => {
    const byExact = new Map();
    const byNumeric = new Map();
    for (const row of rows) {
      const key = normalizeChest(row.chestNo);
      if (!key) continue;
      byExact.set(key, row);
      const numeric = key.replace(/^0+/, "") || "0";
      if (!byNumeric.has(numeric)) {
        byNumeric.set(numeric, row);
      }
    }
    return { byExact, byNumeric };
  };

  const findRowByChest = (lookup, raw) => {
    const key = normalizeChest(raw);
    if (!key) return null;
    if (lookup.byExact.has(key)) {
      return lookup.byExact.get(key);
    }
    const numeric = key.replace(/^0+/, "") || "0";
    return lookup.byNumeric.get(numeric) || null;
  };

  let totalPromoted = 0;
  let nextRoundParticipants = null;
  let promotedSource = [];
  let selectedChestNos = [];

  if (targetRound === "winners") {
    if (!Array.isArray(chestNos) || !chestNos.length) {
      throw new AppError(
        "chestNos is required for final result — pass finalists to rank for 1st/2nd/3rd",
        400
      );
    }
    if (chestNos.length > 3) {
      throw new AppError(
        "chestNos for final may have at most 3 entries (1st, 2nd, 3rd)",
        400
      );
    }

    const lookup = buildChestLookup(currentRoundData);
    const seen = new Set();
    const medalists = [];

    for (const raw of chestNos) {
      const key = normalizeChest(raw);
      if (!key) {
        continue;
      }
      const matchKey = key.replace(/^0+/, "") || "0";
      if (seen.has(matchKey) || seen.has(key)) {
        throw new AppError(`Duplicate chest number "${key}"`, 400);
      }
      seen.add(matchKey);
      seen.add(key);

      const row = findRowByChest(lookup, key);
      if (!row) {
        throw new AppError(
          `Chest number "${key}" not found in Final Round for "${resolvedName}"`,
          400
        );
      }
      medalists.push(row);
    }

    if (!medalists.length) {
      throw new AppError("No skaters selected for final result", 400);
    }

    // Rank by time when any selected skater has a time; otherwise by position.
    const hasAnyTime = medalists.some((row) => hasNonEmptyTime(row?.time));
    const ranked = [...medalists].sort((a, b) => {
      if (hasAnyTime) {
        const timeA = getSecondsFromTime(String(a?.time || ""));
        const timeB = getSecondsFromTime(String(b?.time || ""));
        if (timeA !== timeB) {
          return timeA - timeB;
        }
      } else {
        const posA = Number(String(a?.position ?? "").trim());
        const posB = Number(String(b?.position ?? "").trim());
        const validA = Number.isInteger(posA) && posA >= 1;
        const validB = Number.isInteger(posB) && posB >= 1;
        if (validA && validB && posA !== posB) {
          return posA - posB;
        }
        if (validA && !validB) {
          return -1;
        }
        if (!validA && validB) {
          return 1;
        }
      }
      return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
    });

    const firstPlace = ranked[0] || null;
    const secondPlace = ranked[1] || null;
    const thirdPlace = ranked[2] || null;
    selectedChestNos = ranked.map((row) => normalizeChest(row.chestNo));

    setCategoryRound(
      category,
      "1st",
      mergeRoundRowsByGender(
        category["1st"],
        firstPlace ? [mapCompetitorForMedal(firstPlace, "1")] : [],
        genderBySkaterId,
        genderFilter
      )
    );
    setCategoryRound(
      category,
      "2nd",
      mergeRoundRowsByGender(
        category["2nd"],
        secondPlace ? [mapCompetitorForMedal(secondPlace, "2")] : [],
        genderBySkaterId,
        genderFilter
      )
    );
    setCategoryRound(
      category,
      "3rd",
      mergeRoundRowsByGender(
        category["3rd"],
        thirdPlace ? [mapCompetitorForMedal(thirdPlace, "3")] : [],
        genderBySkaterId,
        genderFilter
      )
    );

    totalPromoted =
      (firstPlace ? 1 : 0) + (secondPlace ? 1 : 0) + (thirdPlace ? 1 : 0);
    nextRoundParticipants = {
      "1st": firstPlace ? [mapCompetitorForMedal(firstPlace, "1")] : [],
      "2nd": secondPlace ? [mapCompetitorForMedal(secondPlace, "2")] : [],
      "3rd": thirdPlace ? [mapCompetitorForMedal(thirdPlace, "3")] : [],
    };
  } else {
    if (!Array.isArray(chestNos) || !chestNos.length) {
      throw new AppError(
        "chestNos is required — pass the chest numbers to promote",
        400
      );
    }

    const lookup = buildChestLookup(currentRoundData);
    const seen = new Set();

    for (const raw of chestNos) {
      const key = normalizeChest(raw);
      if (!key) {
        continue;
      }
      const matchKey = key.replace(/^0+/, "") || "0";
      if (seen.has(matchKey) || seen.has(key)) {
        throw new AppError(`Duplicate chest number "${key}"`, 400);
      }
      seen.add(matchKey);
      seen.add(key);

      const row = findRowByChest(lookup, key);
      if (!row) {
        const available = currentRoundData
          .map((r) => normalizeChest(r.chestNo))
          .filter(Boolean);
        throw new AppError(
          `Chest number "${key}" not found in ${round} for "${resolvedName}" (event ${eventId}). Available: ${available.join(", ") || "none"}`,
          400
        );
      }
      promotedSource.push(row);
    }

    if (!promotedSource.length) {
      throw new AppError(`No skaters to promote from "${round}"`, 400);
    }

    selectedChestNos = promotedSource.map((row) => normalizeChest(row.chestNo));

    // Create / replace this gender's rows in the next round (fresh time/position)
    setCategoryRound(
      category,
      targetRound,
      mergeRoundRowsByGender(
        category[targetRound],
        promotedSource.map(cloneCompetitorForNextRound),
        genderBySkaterId,
        genderFilter
      )
    );
    clearSubsequentRoundsInCategoryByGender(
      category,
      targetRound,
      genderBySkaterId,
      genderFilter
    );
    totalPromoted = promotedSource.length;
    nextRoundParticipants = promotedSource
      .map(cloneCompetitorForNextRound)
      .map(mapCompetitor);
  }

  if (totalPromoted === 0) {
    throw new AppError(`No skaters qualified to progress from "${round}"`, 400);
  }

  competition.markModified("categories");
  await competition.save();

  return {
    eventId: competition.eventId,
    ageGroup: competition.ageGroup,
    name: category.name,
    categoryId: resolvedCategoryId,
    gender: genderLabel,
    fromRound: isFinalResultSubmit ? "final" : round,
    fromRoundName: isFinalResultSubmit
      ? "Final Round"
      : MANUAL_ROUND_DISPLAY_NAME[round] || round,
    renamedFromRound:
      isFinalResultSubmit && sourceRound !== "final" ? sourceRound : undefined,
    toRound: targetRound,
    nextRound: optionalNextRound || targetRound,
    isFinalResult: targetRound === "winners",
    chestNos: selectedChestNos,
    totalInFromRound: currentRoundData.length,
    promotedCount: totalPromoted,
    ...(targetRound === "winners"
      ? { result: nextRoundParticipants }
      : { [targetRound]: nextRoundParticipants }),
  };
};
