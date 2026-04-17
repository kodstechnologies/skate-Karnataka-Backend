import { create_report_repositories, get_club_id } from "./report.repositories.js";

const create_report_service = async(skaterId , data)=>{
    const club = await get_club_id(skaterId);
await create_report_repositories(skaterId, data, club);
}

export {
    create_report_service
}