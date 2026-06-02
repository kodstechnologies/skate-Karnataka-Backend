import { AGE_GROUPS } from "./SkatingEventCategory.model.js";

const AGE_GROUP_LABELS = AGE_GROUPS.map((g) => g.label);

/** Normalize custom name rows from API or DB into trimmed strings. */
export const normalizeCustomCategoryNames = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((row) => {
      if (typeof row === "string") {
        return row.trim();
      }
      if (row && typeof row === "object") {
        return String(row.name || "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

/** Each custom lap name is available under every age group (for event registration). */
export const buildAgeGroupsFromCustomNames = (customCategoryNames) => {
  const names = normalizeCustomCategoryNames(customCategoryNames);
  if (!names.length) {
    return [];
  }

  const categories = names.map((name) => ({ name }));

  return AGE_GROUP_LABELS.map((label) => ({
    label,
    categories,
  }));
};

export const extractCustomNamesFromDoc = (doc) => {
  if (!doc) {
    return [];
  }

  if (Array.isArray(doc.customCategoryNames) && doc.customCategoryNames.length) {
    return normalizeCustomCategoryNames(doc.customCategoryNames);
  }

  const fromAgeGroups = (doc.ageGroups || []).flatMap((ag) =>
    (ag.categories || []).map((c) => c?.name || "")
  );

  return [...new Set(normalizeCustomCategoryNames(fromAgeGroups))];
};

export const getClubOverrideFromStandardDoc = (standardDoc, clubId) => {
  if (!standardDoc || !clubId) {
    return null;
  }

  return (standardDoc.clubOverrides || []).find(
    (row) => row?.club && String(row.club) === String(clubId)
  );
};

export const getDistrictOverrideFromStandardDoc = (standardDoc, districtId) => {
  if (!standardDoc || !districtId) {
    return null;
  }

  return (standardDoc.districtOverrides || []).find(
    (row) => row?.district && String(row.district) === String(districtId)
  );
};

export const getOrgOverrideFromStandardDoc = (standardDoc, { clubId = null, districtId = null } = {}) => {
  if (districtId) {
    return getDistrictOverrideFromStandardDoc(standardDoc, districtId);
  }
  if (clubId) {
    return getClubOverrideFromStandardDoc(standardDoc, clubId);
  }
  return null;
};

/** Apply club/district override onto a standard category for APIs and event forms. */
export const mergeStandardWithOrgOverride = (standardDoc, { clubId = null, districtId = null } = {}) => {
  if (!standardDoc) {
    return null;
  }

  const override = getOrgOverrideFromStandardDoc(standardDoc, { clubId, districtId });
  if (!override) {
    return standardDoc;
  }

  const names = extractCustomNamesFromDoc(override);
  if (!names.length) {
    return standardDoc;
  }

  const ageGroups =
    Array.isArray(override.ageGroups) && override.ageGroups.length
      ? override.ageGroups
      : buildAgeGroupsFromCustomNames(names);

  return {
    ...standardDoc,
    typeName: override.typeName?.trim() || standardDoc.typeName,
    customCategoryNames: override.customCategoryNames,
    ageGroups,
    _effectiveOverride: true,
  };
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

  if (format === EVENT_CATEGORY_FORMAT.STANDARD) {
    return list.map((doc) => ({
      ...doc,
      typeName: doc.typeName,
      ageGroups: doc.ageGroups || [],
    }));
  }

  const scope =
    event?.eventType === "Club"
      ? { clubId: event.eventFor }
      : event?.eventType === "District"
        ? { districtId: event.eventFor }
        : {};

  return list.map((doc) => mergeStandardWithOrgOverride(doc, scope));
};

export const buildOverridePayloadFromInput = ({ typeName, customCategoryNames, names, ageGroups } = {}) => {
  const normalizedNames = normalizeCustomCategoryNames(
    customCategoryNames ?? names ?? []
  );
  const resolvedAgeGroups =
    Array.isArray(ageGroups) && ageGroups.length
      ? ageGroups
      : buildAgeGroupsFromCustomNames(normalizedNames);

  return {
    typeName: typeName?.trim() || "",
    customCategoryNames: normalizedNames.map((name) => ({ name })),
    ageGroups: resolvedAgeGroups,
  };
};
