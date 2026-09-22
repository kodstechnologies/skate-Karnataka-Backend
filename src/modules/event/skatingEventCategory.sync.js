import { AppError } from "../../util/common/AppError.js";
import { AGE_GROUPS } from "./SkatingEventCategory.model.js";

const AGE_GROUP_LABELS = AGE_GROUPS.map((g) => g.label);

const isValidFormulaId = (value) =>
  /^[0-9a-fA-F]{24}$/.test(String(value || "").trim());

/** Every named lap/category row must reference a Formula document (admin saves). */
export const assertAgeGroupCategoriesHaveFormula = (ageGroups = []) => {
  if (!Array.isArray(ageGroups)) {
    return;
  }

  for (const ageGroup of ageGroups) {
    for (const category of ageGroup.categories || []) {
      const name = String(category?.name || "").trim();
      if (!name) {
        continue;
      }
      if (!isValidFormulaId(category?.formula)) {
        throw new AppError(
          `Formula is required for category "${name}"`,
          400
        );
      }
    }
  }
};

/** Normalize custom name rows from API or DB (name + optional formula per lap/time). */
export const normalizeCustomCategoryNameRows = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  const rows = [];
  const seen = new Set();

  for (const item of input) {
    let name = "";
    let formula = null;

    if (typeof item === "string") {
      name = item.trim();
    } else if (item && typeof item === "object") {
      name = String(item.name || "").trim();
      if (isValidFormulaId(item.formula)) {
        formula = String(item.formula).trim();
      }
    }

    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);

    const row = { name };
    if (formula) {
      row.formula = formula;
    }
    rows.push(row);
  }

  return rows;
};

/** Normalize custom name rows from API or DB into trimmed strings. */
export const normalizeCustomCategoryNames = (input) =>
  normalizeCustomCategoryNameRows(input).map((row) => row.name);

const rowToCategory = ({ name, formula }) => {
  const category = { name };
  if (formula) {
    category.formula = formula;
  }
  return category;
};

/** Copy formula from customCategoryNames onto ageGroups categories matched by name. */
export const mergeFormulasIntoAgeGroups = (ageGroups, customRows = []) => {
  if (!Array.isArray(ageGroups) || !ageGroups.length) {
    return ageGroups;
  }

  const formulaByName = new Map(
    normalizeCustomCategoryNameRows(customRows)
      .filter((row) => row.formula)
      .map((row) => [row.name, row.formula])
  );

  if (!formulaByName.size) {
    return ageGroups;
  }

  return ageGroups.map((ageGroup) => ({
    ...ageGroup,
    categories: (ageGroup.categories || []).map((category) => {
      const name = String(category?.name || "").trim();
      const formula =
        (isValidFormulaId(category?.formula) ? String(category.formula).trim() : null) ||
        formulaByName.get(name) ||
        null;

      if (!formula) {
        return category;
      }
      return { ...category, formula };
    }),
  }));
};

/** Each custom lap name is available under every age group (for event registration). */
export const buildAgeGroupsFromCustomNames = (customCategoryNames) => {
  const rows = normalizeCustomCategoryNameRows(customCategoryNames);
  if (!rows.length) {
    return [];
  }

  const categories = rows.map(rowToCategory);

  return AGE_GROUP_LABELS.map((label) => ({
    label,
    categories,
  }));
};

export const extractCustomCategoryRowsFromDoc = (doc) => {
  if (!doc) {
    return [];
  }

  if (Array.isArray(doc.customCategoryNames) && doc.customCategoryNames.length) {
    return normalizeCustomCategoryNameRows(doc.customCategoryNames);
  }

  const fromAgeGroups = (doc.ageGroups || []).flatMap((ag) => ag.categories || []);
  const byName = new Map();

  for (const category of fromAgeGroups) {
    const name = String(category?.name || "").trim();
    if (!name || byName.has(name)) {
      continue;
    }
    const row = { name };
    if (isValidFormulaId(category?.formula)) {
      row.formula = String(category.formula).trim();
    }
    byName.set(name, row);
  }

  return [...byName.values()];
};

export const extractCustomNamesFromDoc = (doc) =>
  extractCustomCategoryRowsFromDoc(doc).map((row) => row.name);

export const categoryNameOf = (doc) =>
  String(doc?.name || doc?.typeName || "").trim();

export const withCategoryNameAlias = (doc) => {
  if (!doc) {
    return doc;
  }
  const name = categoryNameOf(doc);
  return { ...doc, name, typeName: name };
};

export const findDisciplineInCategory = (category, disciplineId) => {
  if (!category || !disciplineId) {
    return null;
  }
  return (category.disciplines || []).find((row) => String(row._id) === String(disciplineId)) || null;
};

export const toDisciplineView = (parent, discipline) => {
  const parentName = categoryNameOf(parent);
  const name = String(discipline?.name || "").trim();
  return {
    ...discipline,
    _id: discipline?._id,
    parentCategoryId: parent?._id,
    parentName,
    name,
    typeName: name || parentName,
    ageGroups: discipline?.ageGroups || [],
    customCategoryNames: discipline?.customCategoryNames || [],
    clubOverrides: discipline?.clubOverrides || [],
    districtOverrides: discipline?.districtOverrides || [],
    categoryStatus: discipline?.categoryStatus,
    club: discipline?.club ?? null,
    district: discipline?.district ?? null,
  };
};

export const expandCategoryToDisciplineViews = (parent) => {
  if (!parent) {
    return [];
  }
  return (parent.disciplines || []).map((discipline) => toDisciplineView(parent, discipline));
};

export const getClubOverrideFromStandardDoc = (disciplineOrDoc, clubId) => {
  if (!disciplineOrDoc || !clubId) {
    return null;
  }

  return (disciplineOrDoc.clubOverrides || []).find(
    (row) => row?.club && String(row.club) === String(clubId)
  );
};

export const getDistrictOverrideFromStandardDoc = (disciplineOrDoc, districtId) => {
  if (!disciplineOrDoc || !districtId) {
    return null;
  }

  return (disciplineOrDoc.districtOverrides || []).find(
    (row) => row?.district && String(row.district) === String(districtId)
  );
};

export const getOrgOverrideFromStandardDoc = (
  disciplineOrDoc,
  { clubId = null, districtId = null } = {}
) => {
  if (districtId) {
    return getDistrictOverrideFromStandardDoc(disciplineOrDoc, districtId);
  }
  if (clubId) {
    return getClubOverrideFromStandardDoc(disciplineOrDoc, clubId);
  }
  return null;
};

export const mergeDisciplineWithOrgOverride = (
  discipline,
  { clubId = null, districtId = null } = {}
) => {
  if (!discipline) {
    return null;
  }

  const override = getOrgOverrideFromStandardDoc(discipline, { clubId, districtId });
  if (!override) {
    return {
      ...discipline,
      name: discipline.name,
      typeName: discipline.name,
    };
  }

  const rows = extractCustomCategoryRowsFromDoc(override);
  if (!rows.length) {
    return {
      ...discipline,
      name: discipline.name,
      typeName: discipline.name,
    };
  }

  const ageGroups =
    Array.isArray(override.ageGroups) && override.ageGroups.length
      ? mergeFormulasIntoAgeGroups(override.ageGroups, rows)
      : buildAgeGroupsFromCustomNames(rows);

  return {
    ...discipline,
    name: discipline.name,
    typeName: override.typeName?.trim() || discipline.name,
    customCategoryNames: rows,
    ageGroups,
    _effectiveOverride: true,
  };
};

/** Apply club/district override onto each discipline of a parent category. */
export const mergeStandardWithOrgOverride = (
  standardDoc,
  { clubId = null, districtId = null } = {}
) => {
  if (!standardDoc) {
    return null;
  }

  const disciplines = (standardDoc.disciplines || []).map((discipline) =>
    mergeDisciplineWithOrgOverride(discipline, { clubId, districtId })
  );

  return withCategoryNameAlias({
    ...standardDoc,
    disciplines,
  });
};

export const EVENT_CATEGORY_FORMAT = Object.freeze({
  STANDARD: "standard",
  CUSTOM: "custom",
});

export const normalizeCategoryFormat = (value) => {
  const raw = String(value || EVENT_CATEGORY_FORMAT.STANDARD).trim().toLowerCase();
  return raw === EVENT_CATEGORY_FORMAT.CUSTOM
    ? EVENT_CATEGORY_FORMAT.CUSTOM
    : EVENT_CATEGORY_FORMAT.STANDARD;
};

/** Resolve ageGroups for an event from linked SkatingEventCategory docs. */
export const resolveSkatingCategoriesForEvent = (event, docs = []) => {
  const list = Array.isArray(docs) ? docs : [];
  const format = normalizeCategoryFormat(event?.categoryFormat);

  const eventForId =
    event?.eventFor && typeof event.eventFor === "object" && event.eventFor._id
      ? event.eventFor._id
      : event?.eventFor;

  const scope =
    format === EVENT_CATEGORY_FORMAT.CUSTOM
      ? event?.eventType === "Club"
        ? { clubId: eventForId }
        : event?.eventType === "District"
          ? { districtId: eventForId }
          : {}
      : {};

  return list.flatMap((doc) => {
    const merged =
      format === EVENT_CATEGORY_FORMAT.CUSTOM
        ? mergeStandardWithOrgOverride(doc, scope)
        : withCategoryNameAlias(doc);
    return expandCategoryToDisciplineViews(merged);
  }).filter((discipline) => {
    const selected = Array.isArray(event?.skatingEventDisciplines)
      ? event.skatingEventDisciplines.map((id) => String(id))
      : [];
    if (!selected.length) {
      return true;
    }
    return selected.includes(String(discipline?._id));
  });
};

export const buildOverridePayloadFromInput = ({ typeName, customCategoryNames, names, ageGroups } = {}) => {
  const rows = normalizeCustomCategoryNameRows(customCategoryNames ?? names ?? []);
  const resolvedAgeGroups =
    Array.isArray(ageGroups) && ageGroups.length
      ? mergeFormulasIntoAgeGroups(ageGroups, rows)
      : buildAgeGroupsFromCustomNames(rows);

  return {
    typeName: typeName?.trim() || "",
    customCategoryNames: rows.map(rowToCategory),
    ageGroups: resolvedAgeGroups,
  };
};

/** Prepare create/update payload for a discipline: sync customCategoryNames → ageGroups. */
export const prepareDisciplinePayload = (payload = {}) => {
  const rows = normalizeCustomCategoryNameRows(
    payload.customCategoryNames ?? payload.names ?? []
  );

  let ageGroups = payload.ageGroups;
  if (Array.isArray(ageGroups) && ageGroups.length) {
    ageGroups = mergeFormulasIntoAgeGroups(ageGroups, rows);
  } else if (rows.length) {
    ageGroups = buildAgeGroupsFromCustomNames(rows);
  } else {
    ageGroups = Array.isArray(ageGroups) ? ageGroups : [];
  }

  const next = { ...payload, ageGroups };
  delete next.names;
  delete next.typeName;

  // Ensure name is always set from either name or typeName
  const nameFromPayload = String(payload.name || payload.typeName || "").trim();
  if (nameFromPayload) {
    next.name = nameFromPayload;
  }

  if (rows.length) {
    next.customCategoryNames = rows.map(rowToCategory);
  }

  return next;
};

/** Parent category payload: identity plus optional nested disciplines. */
export const prepareEventCategoryPayload = (payload = {}) => {
  const name = String(payload.name || payload.typeName || "").trim();
  const next = {};
  if (name) {
    next.name = name;
  }

  if (Array.isArray(payload.disciplines)) {
    next.disciplines = payload.disciplines.map((row) => prepareDisciplinePayload(row));
  }

  return next;
};
