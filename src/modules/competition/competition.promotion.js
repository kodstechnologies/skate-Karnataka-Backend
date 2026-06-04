/**
 * Promotion using Formula rounds (qualifyCount, groupSize, qualifyPerGroup).
 */

const positionQualifies = (position, qualifyPerGroup) => {
  const value = String(position ?? "").trim();
  if (qualifyPerGroup >= 2) {
    return value === "1" || value === "2";
  }
  return value === "1";
};

const pickFromGroup = (group, qualifyPerGroup, getSecondsFromTime) => {
  const perGroup = Math.max(Number(qualifyPerGroup) || 1, 1);
  const cap = Math.min(perGroup, group.length);
  if (!cap) {
    return [];
  }

  const selectedByPosition = group
    .filter((row) => positionQualifies(row.position, perGroup))
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

  if (selectedByPosition.length >= cap) {
    return selectedByPosition.slice(0, cap);
  }

  const selectedIds = new Set(selectedByPosition.map((row) => String(row.skaterId)));
  const selectedByTime = group
    .filter(
      (row) =>
        !selectedIds.has(String(row.skaterId)) &&
        row.time &&
        String(row.time).trim() !== ""
    )
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time))
    .slice(0, cap - selectedByPosition.length);

  return [...selectedByPosition, ...selectedByTime];
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
    return [];
  }

  let promoted = [];

  if (groupSize > 0) {
    for (let i = 0; i < currentRoundData.length; i += groupSize) {
      const group = currentRoundData.slice(i, i + groupSize);
      promoted.push(...pickFromGroup(group, qualifyPerGroup, getSecondsFromTime));
    }
    return promoted.slice(0, targetTotal);
  }

  promoted = pickFromGroup(currentRoundData, qualifyPerGroup, getSecondsFromTime);

  if (promoted.length < targetTotal) {
    const selectedIds = new Set(promoted.map((row) => String(row.skaterId)));
    const fillPool = currentRoundData
      .filter((row) => {
        if (selectedIds.has(String(row.skaterId))) {
          return false;
        }
        if (!row.time || !String(row.time).trim()) {
          return false;
        }
        const pos = String(row.position ?? "").trim();
        if (qualifyPerGroup >= 2) {
          return pos !== "1" && pos !== "2";
        }
        return pos !== "1";
      })
      .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time));

    promoted = [
      ...promoted,
      ...fillPool.slice(0, targetTotal - promoted.length),
    ];
  }

  return promoted.slice(0, targetTotal);
};

const selectTimePromoted = (currentRoundData, cap, getSecondsFromTime) => {
  const limit = Math.max(Number(cap) || 0, 0);
  if (!limit) {
    return [];
  }

  return currentRoundData
    .filter((row) => row.time && String(row.time).trim() !== "")
    .sort((a, b) => getSecondsFromTime(a.time) - getSecondsFromTime(b.time))
    .slice(0, limit);
};

export const selectPromotedCompetitors = (
  currentRoundData,
  cap,
  qualificationType,
  getSecondsFromTime,
  formulaRound = null
) => {
  if (!Array.isArray(currentRoundData) || !currentRoundData.length) {
    return [];
  }

  const limit = Math.max(Number(cap) || 0, 0);
  if (!limit) {
    return [];
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
