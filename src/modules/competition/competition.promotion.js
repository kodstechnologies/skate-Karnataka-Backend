/**
 * Promotion: TIME = fastest times up to limit.
 * POSITION = position qualifiers (per group or all), then fastest times to fill qualifyCount.
 */

/** Fastest times among skaters not already selected (ignores position for fill). */
const fillByFastestTime = (
  rows,
  selectedIds,
  count,
  getSecondsFromTime
) => {
  const limit = Math.max(Number(count) || 0, 0);
  if (!limit) {
    return [];
  }

  return rows
    .filter((row) => {
      if (selectedIds.has(String(row.skaterId))) {
        return false;
      }
      return row.time && String(row.time).trim() !== "";
    })
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time))
    .slice(0, limit);
};

const positionQualifies = (position, qualifyPerGroup) => {
  const value = String(position ?? "").trim();
  if (qualifyPerGroup >= 2) {
    return value === "1" || value === "2";
  }
  return value === "1";
};

/** All position qualifiers in the round, then fastest times to reach cap. */
const selectPositionPromotedGlobal = (
  currentRoundData,
  qualifyPerGroup,
  getSecondsFromTime,
  cap
) => {
  const targetTotal = Math.max(Number(cap) || 0, 0);
  if (!targetTotal) {
    return { promoted: [], selectedByPosition: [], selectedByTime: [] };
  }

  const selectedByPosition = currentRoundData
    .filter((row) => positionQualifies(row.position, qualifyPerGroup))
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

  const selectedIds = new Set(
    selectedByPosition.map((row) => String(row.skaterId))
  );
  let selectedByTime = [];

  if (selectedByPosition.length < targetTotal) {
    const pending = targetTotal - selectedByPosition.length;
    selectedByTime = fillByFastestTime(
      currentRoundData,
      selectedIds,
      pending,
      getSecondsFromTime
    );
  }

  const promoted = [...selectedByPosition, ...selectedByTime].slice(0, targetTotal);

  return { promoted, selectedByPosition, selectedByTime };
};

const selectPositionPromoted = (
  currentRoundData,
  formulaRound,
  getSecondsFromTime,
  cap
) => {
  const qualifyPerGroup = Math.max(Number(formulaRound?.qualifyPerGroup) || 1, 1);
  const groupSize = Math.max(Number(formulaRound?.groupSize) || 0, 0);
  const targetTotal = Math.max(Number(cap) || 0, 0);

  if (!targetTotal) {
    return { promoted: [], selectedByPosition: [], selectedByTime: [] };
  }

  if (groupSize <= 0) {
    return selectPositionPromotedGlobal(
      currentRoundData,
      qualifyPerGroup,
      getSecondsFromTime,
      targetTotal
    );
  }

  // Phase 1: all position-marked skaters in each group (position 1, or 1+2 if qualifyPerGroup >= 2).
  let selectedByPosition = [];
  for (let i = 0; i < currentRoundData.length; i += groupSize) {
    const group = currentRoundData.slice(i, i + groupSize);
    const byPosition = group
      .filter((row) => positionQualifies(row.position, qualifyPerGroup))
      .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));
    selectedByPosition.push(...byPosition);
  }

  selectedByPosition.sort(
    (a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time)
  );
  if (selectedByPosition.length > targetTotal) {
    selectedByPosition = selectedByPosition.slice(0, targetTotal);
  }

  const selectedIds = new Set(
    selectedByPosition.map((row) => String(row.skaterId))
  );
  let selectedByTime = [];

  // Phase 2: fill remaining slots by fastest time (global, up to qualifyCount).
  if (selectedByPosition.length < targetTotal) {
    const pending = targetTotal - selectedByPosition.length;
    selectedByTime = fillByFastestTime(
      currentRoundData,
      selectedIds,
      pending,
      getSecondsFromTime
    );
  }

  const promoted = [...selectedByPosition, ...selectedByTime];

  return {
    promoted,
    selectedByPosition,
    selectedByTime,
  };
};

const selectTimePromoted = (currentRoundData, cap, getSecondsFromTime) => {
  const limit = Math.max(Number(cap) || 0, 0);
  if (!limit) {
    return { promoted: [], selectedByPosition: [], selectedByTime: [] };
  }

  const promoted = currentRoundData
    .filter((row) => row.time && String(row.time).trim() !== "")
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time))
    .slice(0, limit);

  return {
    promoted,
    selectedByPosition: [],
    selectedByTime: promoted,
  };
};

export const selectPromotedCompetitorsWithBreakdown = (
  currentRoundData,
  cap,
  qualificationType,
  getSecondsFromTime,
  formulaRound = null
) => {
  if (!Array.isArray(currentRoundData) || !currentRoundData.length) {
    return {
      promoted: [],
      selectedByPosition: [],
      selectedByTime: [],
    };
  }

  const limit = Math.max(Number(cap) || 0, 0);
  if (!limit) {
    return {
      promoted: [],
      selectedByPosition: [],
      selectedByTime: [],
    };
  }

  if (qualificationType === "POSITION" && formulaRound) {
    return selectPositionPromoted(
      currentRoundData,
      formulaRound,
      getSecondsFromTime,
      limit
    );
  }

  return selectTimePromoted(currentRoundData, limit, getSecondsFromTime);
};

export const selectPromotedCompetitors = (
  currentRoundData,
  cap,
  qualificationType,
  getSecondsFromTime,
  formulaRound = null
) =>
  selectPromotedCompetitorsWithBreakdown(
    currentRoundData,
    cap,
    qualificationType,
    getSecondsFromTime,
    formulaRound
  ).promoted;

export const selectFinalWinners = (finalRoundData, medalCount, getSecondsFromTime) => {
  const data = Array.isArray(finalRoundData) ? finalRoundData : [];
  const maxMedals = Math.min(Math.max(Number(medalCount) || 3, 1), 3);

  let firstPlace = data.find((row) => row.position === "1");
  let secondPlace = data.find((row) => row.position === "2");

  const remaining = data
    .filter((row) => row !== firstPlace && row !== secondPlace)
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

  if (!firstPlace && remaining.length > 0) {
    firstPlace = remaining.shift();
  }
  if (!secondPlace && remaining.length > 0) {
    secondPlace = remaining.shift();
  }
  const thirdPlace = maxMedals >= 3 && remaining.length > 0 ? remaining[0] : null;

  return {
    firstPlace: firstPlace || null,
    secondPlace: secondPlace || null,
    thirdPlace,
  };
};
