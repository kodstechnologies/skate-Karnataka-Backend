import { create_report_repositories, get_club_id, get_skater_report_repositories } from "./report.repositories.js";

const create_report_service = async (skaterId, data) => {
    const club = await get_club_id(skaterId);
    await create_report_repositories(skaterId, data, club);
}

const solve_report_service = async (skaterId) => {
    await solve_report_repositories(skaterId);
}

const get_skater_report_service = async (
    id,
    page,
    limit,
    status,
    reportType) => {
    return await get_skater_report_repositories(id,
        page,
        limit,
        status,
        reportType)
}

export {
    create_report_service,
    solve_report_service,
    get_skater_report_service,
}