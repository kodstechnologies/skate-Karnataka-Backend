import { create_report_repositories, get_club_id, get_skater_report_repositories, update_status_repositories } from "./report.repositories.js";

const create_report_service = async (skaterId, data) => {
    const club = await get_club_id(skaterId);
    await create_report_repositories(skaterId, data, club);
}

const update_status_service = async (id ,status) => {
    await update_status_repositories(id , status);
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
    update_status_service,
    get_skater_report_service,
}