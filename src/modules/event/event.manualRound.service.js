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
  scopeResolvedSkatingCategories,
  toCompetitionGenderLabel,
} from "../competition/displayRound.util.js";
import { selectFinalWinners } from "../competition/competition.promotion.js";
import { getEventSkatingEventCategoriesFullRepository } from "./event.repositories.js";
import { AppError } from "../../util/common/AppError.js";
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
      String(user.gender || "").trim().toLowerCase(),
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
 * Sort: ranked positions (1→3) first, then lowest time → highest.
 * Missing position/time sink to the bottom.
 */
export const sortManualCompetitors = (rows = []) => {
  const list = Array.isArray(rows) ? [...rows] : [];

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

const applyCompetitorResultUpdate = (competitor, { time, position }) => {
  if (hasNonEmptyTime(time)) {
    competitor.time = normalizeCompetitionTimeForStorage(time);
  }
  if (hasProvidedPosition(position)) {
    competitor.position = normalizeCompetitionPosition(position);
  }
};

/**
 * Progressive manual rounds: start at 1stRound only; unlock the next after
 * the current round has participants (e.g. after promote). Do not list future rounds.
 */
const toProgressiveManualCategory = (formatted) => {
  const allRounds = Array.isArray(formatted?.rounds) ? formatted.rounds : [];
  const activeRound = formatted?.activeRound || "1stRound";
  const activeIdx = allRounds.findIndex((row) => row.round === activeRound);
  const unlockedThrough = activeIdx >= 0 ? activeIdx : 0;
  const unlockedRounds =
    activeRound == null
      ? allRounds
      : allRounds.slice(0, unlockedThrough + 1);

  return {
    name: formatted.name,
    categoryId: formatted.categoryId ? String(formatted.categoryId) : null,
    activeRound: activeRound || "1stRound",
    rounds: unlockedRounds,
  };
};

/**
 * GET manual-rounds — progressive display:
 * default 1stRound → after that round is done / next has skaters → show 2nd, etc.
 * Future rounds are not listed until unlocked.
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

    const category = toProgressiveManualCategory(
      formatCategoryRoundDisplay(
        applyGender(competitionCategory || { name: resolvedName }),
        meta?.formula,
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
    }).map(toProgressiveManualCategory);

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
      }).map(toProgressiveManualCategory),
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
 */
export const getManualRoundsAllSkaterService = async ({
  eventId,
  ageGroup,
  name,
  round: roundRaw,
  gender: genderQuery,
}) => {
  await assertChestNumbersGeneratedForEvent(eventId);

  const round = normalizeManualRound(roundRaw, { defaultRound: "1stRound" });
  const genderFilter = normalizeCompetitionGenderFilter(genderQuery);
  const genderLabel = toCompetitionGenderLabel(genderQuery);

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const category = findCategoryOrThrow(competition, name);
  const genderBySkaterId = await loadGenderBySkaterId([competition]);

  const skaters = filterCompetitorsByGender(
    (category[round] || []).map(toPlainCompetitorRow),
    genderBySkaterId,
    genderFilter
  ).map(mapCompetitor);

  return {
    eventId,
    ageGroup,
    name: category.name,
    round,
    gender: genderLabel,
    total: skaters.length,
    skaters,
  };
};

/**
 * PATCH manual-update-skater-result — update time and/or position.
 */
export const updateManualSkaterResultService = async (body) => {
  const {
    eventId,
    ageGroup,
    name,
    skaterId,
    time,
    position,
    competitors,
  } = body;
  const round = normalizeManualRound(body.round, { defaultRound: "1stRound" });
  const genderFilter = normalizeCompetitionGenderFilter(body.gender);
  const genderLabel = toCompetitionGenderLabel(body.gender);

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const genderBySkaterId = genderFilter
    ? await loadGenderBySkaterId([competition])
    : new Map();

  const assertSkaterMatchesGender = (id) => {
    if (!genderFilter) return;
    const skaterGender = genderBySkaterId.get(String(id));
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

  const touchedCategories = new Map();

  for (const update of updates) {
    if (!hasNonEmptyTime(update.time) && !hasProvidedPosition(update.position)) {
      throw new AppError(
        "At least one of time or position is required for each skater",
        400
      );
    }

    assertSkaterMatchesGender(update.skaterId);

    let foundCategory = null;
    let foundCompetitor = null;

    const searchCategories = name
      ? [findCategoryOrThrow(competition, name)]
      : competition.categories || [];

    for (const category of searchCategories) {
      const competitor = (category[round] || []).find(
        (row) => String(row.skaterId) === String(update.skaterId)
      );
      if (competitor) {
        foundCategory = category;
        foundCompetitor = competitor;
        break;
      }
    }

    if (!foundCategory || !foundCompetitor) {
      throw new AppError(
        `Skater ${update.skaterId} not found in ${round}`,
        404
      );
    }

    applyCompetitorResultUpdate(foundCompetitor, update);
    clearSubsequentRoundsInCategoryByGender(
      foundCategory,
      round,
      genderBySkaterId,
      genderFilter
    );
    touchedCategories.set(String(foundCategory.name), foundCategory);
  }

  competition.markModified("categories");
  await competition.save();

  const responseCategories = [...touchedCategories.values()].map((category) => ({
    name: category.name,
    competitors: filterCompetitorsByGender(
      category[round] || [],
      genderBySkaterId,
      genderFilter
    ).map(mapCompetitor),
  }));

  return {
    eventId: competition.eventId,
    ageGroup: competition.ageGroup,
    round,
    gender: genderLabel,
    categories: responseCategories,
  };
};

/**
 * GET manual-display-sortby — position first, then lowest→highest time.
 */
export const getManualDisplaySortByService = async (query) => {
  const payload = await getManualRoundsAllSkaterService(query);
  const skaters = sortManualCompetitors(payload.skaters);
  return {
    ...payload,
    sortBy: "position_then_time",
    skaters,
  };
};

/**
 * PATCH manual-update-to-next-round
 * - goToNextRound false → no promotion
 * - round final → medals 1st/2nd/3rd (nextRound optional)
 * - else promote to nextRound if provided, otherwise default next round
 */
export const updateManualToNextRoundService = async (body) => {
  const {
    eventId,
    ageGroup,
    name,
    goToNextRound = true,
    skaterIds,
    promoteCount,
  } = body;
  const round = normalizeManualRound(body.round, { defaultRound: "1stRound" });
  const optionalNextRound = normalizeOptionalNextRound(body.nextRound);
  const genderFilter = normalizeCompetitionGenderFilter(body.gender);
  const genderLabel = toCompetitionGenderLabel(body.gender);

  if (!goToNextRound) {
    return {
      eventId,
      ageGroup,
      name,
      gender: genderLabel,
      fromRound: round,
      goToNextRound: false,
      toRound: null,
      promotedCount: 0,
      message: "Skipped — goToNextRound is false; existing round unchanged",
    };
  }

  const competition = await loadCompetitionOrSync(eventId, ageGroup);
  const category = findCategoryOrThrow(competition, name);
  const genderBySkaterId = await loadGenderBySkaterId([competition]);

  const currentRoundData = filterCompetitorsByGender(
    (category[round] || []).map(toPlainCompetitorRow),
    genderBySkaterId,
    genderFilter
  );

  if (!currentRoundData.length) {
    throw new AppError(
      genderFilter
        ? `No ${genderLabel} skaters in ${round} for "${name}"`
        : `No skaters in ${round} for "${name}"`,
      400
    );
  }

  const defaultNext = NEXT_MANUAL_ROUND[round];
  const targetRound =
    round === "final" ? "winners" : optionalNextRound || defaultNext;

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

  let totalPromoted = 0;
  let nextRoundParticipants = null;
  let promotedSource = [];

  if (targetRound === "winners") {
    const sorted = sortManualCompetitors(currentRoundData);
    const { firstPlace, secondPlace, thirdPlace } = selectFinalWinners(
      sorted,
      3,
      getSecondsFromTime
    );

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
        thirdPlace ? [mapCompetitorForMedal(thirdPlace, "0")] : [],
        genderBySkaterId,
        genderFilter
      )
    );

    totalPromoted =
      (firstPlace ? 1 : 0) + (secondPlace ? 1 : 0) + (thirdPlace ? 1 : 0);
    nextRoundParticipants = {
      "1st": firstPlace ? [mapCompetitorForMedal(firstPlace, "1")] : [],
      "2nd": secondPlace ? [mapCompetitorForMedal(secondPlace, "2")] : [],
      "3rd": thirdPlace ? [mapCompetitorForMedal(thirdPlace, "0")] : [],
    };
  } else {
    let candidates = sortManualCompetitors(currentRoundData);

    if (Array.isArray(skaterIds) && skaterIds.length) {
      const wanted = new Set(skaterIds.map((id) => String(id)));
      candidates = candidates.filter((row) =>
        wanted.has(String(row.skaterId))
      );
      if (!candidates.length) {
        throw new AppError("None of the provided skaterIds are in this round", 400);
      }
    }

    const limit =
      promoteCount != null && Number(promoteCount) > 0
        ? Math.trunc(Number(promoteCount))
        : candidates.length;

    promotedSource = candidates.slice(0, limit);
    if (!promotedSource.length) {
      throw new AppError(`No skaters to promote from "${round}"`, 400);
    }

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
    nextRoundParticipants = promotedSource.map(cloneCompetitorForNextRound).map(mapCompetitor);
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
    gender: genderLabel,
    goToNextRound: true,
    fromRound: round,
    toRound: targetRound,
    nextRound: optionalNextRound,
    totalInFromRound: currentRoundData.length,
    promotedCount: totalPromoted,
    promotedSkaters: nextRoundParticipants,
    [targetRound]: nextRoundParticipants,
  };
};
