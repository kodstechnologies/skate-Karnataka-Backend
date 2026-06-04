import { Event } from "../event/event.model.js";
import { resolveSkatingCategoriesForEvent } from "../event/skatingEventCategory.sync.js";
import {
  findEventCategoryByQuery,
  scopeResolvedSkatingCategories,
} from "./displayRound.util.js";

const FORMULA_ROUND_SEARCH = {
  "1stround": ["1stround"],
  "2ndround": ["2ndround", "quarterfinal"],
  semifinal: ["semifinal"],
  final: ["final"],
};

/** Resolve TIME | POSITION from an already-populated formula document. */
export const getQualificationTypeFromFormula = (formula, competitionRound) => {
  if (!formula?.rounds?.length) {
    return "TIME";
  }

  const searchNames =
    FORMULA_ROUND_SEARCH[String(competitionRound || "").trim().toLowerCase()] || [
      String(competitionRound || "").trim().toLowerCase(),
    ];

  const formulaRound = formula.rounds.find((row) =>
    searchNames.includes(String(row.roundName || "").trim().toLowerCase())
  );

  return formulaRound?.qualificationType === "POSITION" ? "POSITION" : "TIME";
};

/**
 * Returns "TIME" or "POSITION" for a competition round from the linked formula.
 * Defaults to TIME when no formula is configured.
 */
export const getFormulaQualificationTypeForRound = async (
  eventId,
  { ageGroup, categoryName, round, skatingEventCategoryId } = {}
) => {
  const eventDoc = await Event.findById(eventId)
    .populate({
      path: "skatingEventCategories",
      populate: [
        { path: "ageGroups.categories.formula" },
        { path: "clubOverrides.ageGroups.categories.formula" },
        { path: "districtOverrides.ageGroups.categories.formula" },
      ],
    })
    .lean();

  if (!eventDoc) {
    return "TIME";
  }

  const resolved = resolveSkatingCategoriesForEvent(
    eventDoc,
    eventDoc.skatingEventCategories || []
  );
  const scoped = scopeResolvedSkatingCategories(
    resolved,
    skatingEventCategoryId
  );

  const meta = findEventCategoryByQuery(scoped, {
    ageGroup,
    name: categoryName,
    skatingEventCategoryId,
    categoriesId: skatingEventCategoryId,
  });

  return getQualificationTypeFromFormula(meta?.formula, round);
};

export const findFormulaRoundInFormula = (formula, competitionRound) => {
  if (!formula?.rounds?.length) {
    return null;
  }

  const searchNames =
    FORMULA_ROUND_SEARCH[String(competitionRound || "").trim().toLowerCase()] || [
      String(competitionRound || "").trim().toLowerCase(),
    ];

  return (
    formula.rounds.find((row) =>
      searchNames.includes(String(row.roundName || "").trim().toLowerCase())
    ) || null
  );
};

const NEXT_COMPETITION_ROUND = {
  "1stround": "2ndRound",
  "2ndround": "semiFinal",
  semifinal: "final",
  final: "winners",
};

export const getNextCompetitionRound = (competitionRound) =>
  NEXT_COMPETITION_ROUND[String(competitionRound || "").trim().toLowerCase()] || null;

/**
 * How many may advance from the current round (Formula.model.js).
 *
 * Priority:
 * 1) qualifyCount — used when set (never promote more than this)
 * 2) Else qualifyCountLessThan65 / qualifyCountMoreThan65 vs maxParticipants (default 65),
 *    based on skaters in the **current** round only
 */
export const getPromotionLimit = (formulaRound, { currentRoundCount } = {}) => {
  if (!formulaRound) {
    return null;
  }

  const current = Math.max(Number(currentRoundCount) || 0, 0);
  const primary = Number(formulaRound.qualifyCount);
  let limit = null;
  let limitSource = null;

  if (Number.isFinite(primary) && primary > 0) {
    limit = primary;
    limitSource = "qualifyCount";
  } else {
    const threshold =
      Number(formulaRound.maxParticipants) > 0
        ? Number(formulaRound.maxParticipants)
        : 65;
    const less = Number(formulaRound.qualifyCountLessThan65);
    const more = Number(formulaRound.qualifyCountMoreThan65);

    if (current >= threshold && Number.isFinite(more) && more > 0) {
      limit = more;
      limitSource = "qualifyCountMoreThan65";
    } else if (current < threshold && Number.isFinite(less) && less > 0) {
      limit = less;
      limitSource = "qualifyCountLessThan65";
    }
  }

  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) {
    return { limit: null, limitSource: null };
  }

  const capped = current > 0 ? Math.min(n, current) : n;
  return { limit: capped, limitSource };
};

/** @deprecated Use getPromotionLimit return object */
export const getPromotionLimitValue = (formulaRound, ctx) =>
  getPromotionLimit(formulaRound, ctx).limit;

export const getDefaultPromotionLimit = (round, currentRoundData) => {
  const count = Array.isArray(currentRoundData) ? currentRoundData.length : 0;
  if (round === "1stRound") {
    return count > 60 ? 24 : count;
  }
  if (round === "2ndRound") {
    return Math.min(12, count);
  }
  if (round === "semiFinal") {
    return Math.min(4, count);
  }
  return count;
};

export const resolvePromotionContext = async (
  eventId,
  { ageGroup, categoryName, round, skatingEventCategoryId } = {}
) => {
  const eventDoc = await Event.findById(eventId)
    .populate({
      path: "skatingEventCategories",
      populate: [
        { path: "ageGroups.categories.formula" },
        { path: "clubOverrides.ageGroups.categories.formula" },
        { path: "districtOverrides.ageGroups.categories.formula" },
      ],
    })
    .lean();

  if (!eventDoc) {
    return null;
  }

  const resolved = resolveSkatingCategoriesForEvent(
    eventDoc,
    eventDoc.skatingEventCategories || []
  );
  const scoped = scopeResolvedSkatingCategories(
    resolved,
    skatingEventCategoryId
  );

  const meta = findEventCategoryByQuery(scoped, {
    ageGroup,
    name: categoryName,
    skatingEventCategoryId,
    categoriesId: skatingEventCategoryId,
    categoryId: skatingEventCategoryId,
  });

  if (!meta) {
    return null;
  }

  const formulaRound = findFormulaRoundInFormula(meta.formula, round);
  const qualificationType = getQualificationTypeFromFormula(meta.formula, round);
  const nextRound = getNextCompetitionRound(round);

  return {
    meta,
    formulaRound,
    qualificationType,
    nextRound,
    finalSelectionCount: meta.formula?.finalSelectionCount ?? 3,
  };
};
