export const paginate = (page = 1, limit = 10) => {
    const _page = Math.max(Number(page), 1);
    const _limit = Math.max(Number(limit), 1);

    return {
        skip: (_page - 1) * _limit,
        limit: _limit,
        page: _page
    };
};
