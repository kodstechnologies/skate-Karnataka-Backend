import mongoose from "mongoose";
import Formula from "../event/Formula.model.js";
import { getEventSkatingEventCategoriesFullRepository } from "../event/event.repositories.js";
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

/** Load full Formula document when only ObjectId was stored on the category. */
export const ensureFormulaDocument = async (formula) => {
  if (!formula) {
    return null;
  }

  if (Array.isArray(formula.rounds)) {
    return formula;
  }

  const id =
    typeof formula === "object" && formula._id != null ? formula._id : formula;

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return null;
  }

  return Formula.findById(id).lean();
};

/** Resolve TIME | POSITION from a populated formula document. */
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
 * How many may advance (Formula.model.js).
 *
 * - **1stRound only**: qualifyCountLessThan65 / qualifyCountMoreThan65 vs maxParticipants (65).
 * - **All other rounds**: qualifyCount only (fixed number from formula).
 */
export const getPromotionLimit = (
  formulaRound,
  { currentRoundCount, competitionRound } = {}
) => {
  if (!formulaRound) {
    return { limit: null, limitSource: null, threshold: null };
  }

  const current = Math.max(Number(currentRoundCount) || 0, 0);
  const isFirstRound =
    String(competitionRound || "").trim().toLowerCase() === "1stround";

  let limit = null;
  let limitSource = null;
  let threshold = null;

  if (isFirstRound) {
    threshold =
      Number(formulaRound.maxParticipants) > 0
        ? Number(formulaRound.maxParticipants)
        : 65;
    const less = Number(formulaRound.qualifyCountLessThan65);
    const more = Number(formulaRound.qualifyCountMoreThan65);

    if (current >= threshold && Number.isFinite(more) && more > 0) {
      limit = more;
      limitSource = "qualifyCountMoreThan65";
    } else if (Number.isFinite(less) && less > 0) {
      limit = less;
      limitSource = "qualifyCountLessThan65";
    } else if (Number(formulaRound.qualifyCount) > 0) {
      limit = Number(formulaRound.qualifyCount);
      limitSource = "qualifyCount";
    }
  } else {
    const count = Number(formulaRound.qualifyCount);
    if (Number.isFinite(count) && count > 0) {
      limit = count;
      limitSource = "qualifyCount";
    }
  }

  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) {
    return { limit: null, limitSource: null, threshold };
  }

  const capped = current > 0 ? Math.min(n, current) : n;
  return { limit: capped, limitSource, threshold: isFirstRound ? threshold : null };
};

export const loadCategoryMetaForCompetition = async (
  eventId,
  { ageGroup, categoryName, skatingEventCategoryId } = {}
) => {
  const eventMeta = await getEventSkatingEventCategoriesFullRepository(eventId);
  if (!eventMeta) {
    return null;
  }

  const scoped = scopeResolvedSkatingCategories(
    eventMeta.skatingEventCategories || [],
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

  const formula = await ensureFormulaDocument(meta.formula);
  return {
    ...meta,
    formula,
    formulaId: formula?._id ? String(formula._id) : null,
  };
};

/**
 * Returns "TIME" or "POSITION" for a competition round from the linked formula.
 */
export const getFormulaQualificationTypeForRound = async (
  eventId,
  { ageGroup, categoryName, round, skatingEventCategoryId } = {}
) => {
  const meta = await loadCategoryMetaForCompetition(eventId, {
    ageGroup,
    categoryName,
    skatingEventCategoryId,
  });

  return getQualificationTypeFromFormula(meta?.formula, round);
};

export const resolvePromotionContext = async (
  eventId,
  { ageGroup, categoryName, round, skatingEventCategoryId } = {}
) => {
  const meta = await loadCategoryMetaForCompetition(eventId, {
    ageGroup,
    categoryName,
    skatingEventCategoryId,
  });

  if (!meta) {
    return null;
  }

  const formula = meta.formula;
  const formulaRound = findFormulaRoundInFormula(formula, round);

  return {
    meta,
    formula,
    formulaId: meta.formulaId,
    formulaRound,
    qualificationType: getQualificationTypeFromFormula(formula, round),
    nextRound: getNextCompetitionRound(round),
    finalSelectionCount: formula?.finalSelectionCount ?? 3,
  };
};
