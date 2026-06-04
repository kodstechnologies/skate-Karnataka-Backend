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
