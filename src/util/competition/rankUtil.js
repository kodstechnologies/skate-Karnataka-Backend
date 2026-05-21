/** Default / max placeholder (10:00) — not eligible for placement. */
export const COMPETITION_PLACEHOLDER_TIME_SECONDS = 600;

export const isCompetitionRankEligible = (
    row,
    placeholderSeconds = COMPETITION_PLACEHOLDER_TIME_SECONDS
) => {
    if (row?.isDisqualified) return false;
    const timeTaken = row?.timeTaken;
    if (typeof timeTaken !== "number" || Number.isNaN(timeTaken)) return false;
    if (timeTaken <= 0) return false;
    if (
        placeholderSeconds != null &&
        timeTaken >= placeholderSeconds
    ) {
        return false;
    }
    return true;
};

export const sortCompetitionByTime = (a, b) => {
    if (a.isDisqualified !== b.isDisqualified) {
        return a.isDisqualified ? 1 : -1;
    }

    const aTime = typeof a.timeTaken === "number" ? a.timeTaken : null;
    const bTime = typeof b.timeTaken === "number" ? b.timeTaken : null;

    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
};

/**
 * Sort by fastest time, assign rank 1..n (lower time = better rank).
 * Skaters at or above placeholder time (e.g. 600s) get rank null.
 */
export const assignCompetitionRanks = (results, options = {}) => {
    const placeholderSeconds =
        options.placeholderSeconds ?? COMPETITION_PLACEHOLDER_TIME_SECONDS;

    const sorted = [...results].sort(sortCompetitionByTime);
    let runningRank = 0;

    const ranked = sorted.map((row) => {
        if (!isCompetitionRankEligible(row, placeholderSeconds)) {
            return { ...row, rank: null };
        }
        runningRank += 1;
        return { ...row, rank: runningRank };
    });

    const topThree = ranked
        .filter((row) => row.rank != null && row.rank <= 3)
        .sort((a, b) => a.rank - b.rank);

    return { results: ranked, topThree };
};
