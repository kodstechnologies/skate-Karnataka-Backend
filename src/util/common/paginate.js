/** Minimum page count returned in API pagination (including empty lists). */
export const MIN_TOTAL_PAGES = 1;

export const paginate = (page = 1, limit = 10) => {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.max(Number(limit) || 10, 1);

    return {
        skip: (_page - 1) * _limit,
        limit: _limit,
        page: _page,
    };
};

/** Always at least {@link MIN_TOTAL_PAGES} (default 1). */
export const calcTotalPages = (total, limit = 10) => {
    const safeTotal = Math.max(0, Number(total) || 0);
    const pageSize = Math.max(1, Number(limit) || 10);
    return Math.max(MIN_TOTAL_PAGES, Math.ceil(safeTotal / pageSize));
};

export const buildPaginationMeta = ({ total, page, limit }) => {
    const safeTotal = Math.max(0, Number(total) || 0);
    const pageSize = Math.max(1, Number(limit) || 10);
    const currentPage = Math.max(1, Number(page) || 1);

    return {
        total: safeTotal,
        page: currentPage,
        limit: pageSize,
        totalPages: calcTotalPages(safeTotal, pageSize),
    };
};
