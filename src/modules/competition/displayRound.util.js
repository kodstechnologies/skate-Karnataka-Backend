/** Default competition round progression when no formula is linked. */
export const DEFAULT_ROUND_KEYS = Object.freeze([
  "1stRound",
  "2ndRound",
  "semiFinal",
  "final",
]);

const FORMULA_ROUND_TO_COMPETITION_KEY = {
  "1stround": "1stRound",
  "2ndround": "2ndRound",
  "quarterfinal": "2ndRound",
  "semifinal": "semiFinal",
  "final": "final",
};

export const mapFormulaRoundNameToKey = (roundName) =>
  FORMULA_ROUND_TO_COMPETITION_KEY[String(roundName || "").trim().toLowerCase()] || null;

export const getRoundKeysFromFormula = (formula) => {
  if (!formula?.rounds?.length) {
    return [...DEFAULT_ROUND_KEYS];
  }

  const keys = [];
  const seen = new Set();
  for (const round of formula.rounds) {
    const key = mapFormulaRoundNameToKey(round.roundName);
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }

  return keys.length ? keys : [...DEFAULT_ROUND_KEYS];
};

export const findEventCategoryMeta = (resolvedCategories, ageGroup, categoryName) => {
  const normAge = String(ageGroup || "").trim().toLowerCase();
  const normName = String(categoryName || "").trim().toLowerCase();

  for (const skatingCategory of resolvedCategories) {
    const ageGroupEntry = (skatingCategory.ageGroups || []).find(
      (group) => String(group.label || "").trim().toLowerCase() === normAge
    );
    if (!ageGroupEntry) {
      continue;
    }

    const subCategory = (ageGroupEntry.categories || []).find(
      (category) => String(category.name || "").trim().toLowerCase() === normName
    );
    if (!subCategory) {
      continue;
    }

    return {
      skatingEventCategoryId: skatingCategory._id,
      skatingEventCategoryName: skatingCategory.typeName ?? "",
      categoryId: subCategory._id,
      formula: subCategory.formula || null,
    };
  }

  return null;
};

export const listCategoryNamesForAgeGroup = (resolvedCategories, ageGroup) => {
  const normAge = String(ageGroup || "").trim().toLowerCase();
  const names = new Set();

  for (const skatingCategory of resolvedCategories) {
    const ageGroupEntry = (skatingCategory.ageGroups || []).find(
      (group) => String(group.label || "").trim().toLowerCase() === normAge
    );
    for (const category of ageGroupEntry?.categories || []) {
      const label = String(category.name || "").trim();
      if (label) {
        names.add(label);
      }
    }
  }

  return [...names];
};

export const collectAgeGroupLabels = (resolvedCategories, competitions = []) => {
  const labels = new Set();

  for (const competition of competitions) {
    const label = String(competition.ageGroup || "").trim();
    if (label) {
      labels.add(label);
    }
  }

  for (const skatingCategory of resolvedCategories) {
    for (const ageGroup of skatingCategory.ageGroups || []) {
      const label = String(ageGroup.label || "").trim();
      if (label) {
        labels.add(label);
      }
    }
  }

  return [...labels];
};

export const computeActiveRound = (category, roundKeys) => {
  let lastWithData = null;

  for (const key of roundKeys) {
    if ((category[key] || []).length > 0) {
      lastWithData = key;
    }
  }

  if (!lastWithData) {
    return roundKeys[0] || "1stRound";
  }

  const idx = roundKeys.indexOf(lastWithData);
  const nextKey = roundKeys[idx + 1];

  if (nextKey && !(category[nextKey] || []).length) {
    return lastWithData;
  }

  if (lastWithData === "final") {
    const hasPodium =
      (category["1st"] || []).length > 0 ||
      (category["2nd"] || []).length > 0 ||
      (category["3rd"] || []).length > 0;
    return hasPodium ? null : "final";
  }

  if (nextKey && (category[nextKey] || []).length > 0) {
    return computeActiveRound(category, roundKeys.slice(idx + 1));
  }

  return lastWithData;
};

export const formatCategoryRoundDisplay = (categoryDoc, formula, meta = {}) => {
  const category = categoryDoc || { name: "" };
  const roundKeys = getRoundKeysFromFormula(formula);

  const rounds = roundKeys.map((roundKey) => {
    const participants = category[roundKey] || [];
    return {
      round: roundKey,
      status: participants.length > 0,
      count: participants.length,
    };
  });

  const firstCount = (category["1st"] || []).length;
  const secondCount = (category["2nd"] || []).length;
  const thirdCount = (category["3rd"] || []).length;

  const podium = {
    "1st": { status: firstCount > 0, count: firstCount },
    "2nd": { status: secondCount > 0, count: secondCount },
    "3rd": { status: thirdCount > 0, count: thirdCount },
  };

  const formulaId =
    formula?._id != null
      ? String(formula._id)
      : formula != null
        ? String(formula)
        : null;

  return {
    name: category.name,
    ...meta,
    rounds,
    podium,
    "1st": podium["1st"].status,
    "2nd": podium["2nd"].status,
    "3rd": podium["3rd"].status,
    totalSkaters: (category["1stRound"] || []).length,
    activeRound: computeActiveRound(category, roundKeys),
    formulaId,
  };
};

export const buildCategoriesForAgeGroup = ({
  ageGroup,
  resolvedCategories,
  competition,
}) => {
  const names = new Set(listCategoryNamesForAgeGroup(resolvedCategories, ageGroup));

  for (const category of competition?.categories || []) {
    const label = String(category.name || "").trim();
    if (label) {
      names.add(label);
    }
  }

  return [...names].map((categoryName) => {
    const competitionCategory = (competition?.categories || []).find(
      (row) =>
        row.name &&
        row.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
    const meta = findEventCategoryMeta(resolvedCategories, ageGroup, categoryName);

    return formatCategoryRoundDisplay(
      competitionCategory || { name: categoryName },
      meta?.formula,
      meta
        ? {
            skatingEventCategoryId: meta.skatingEventCategoryId
              ? String(meta.skatingEventCategoryId)
              : null,
            skatingEventCategoryName: meta.skatingEventCategoryName || null,
            categoryId: meta.categoryId ? String(meta.categoryId) : null,
          }
        : {}
    );
  });
};
