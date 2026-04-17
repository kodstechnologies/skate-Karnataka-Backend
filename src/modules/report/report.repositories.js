import { BaseAuth } from "../auth/baseAuth.model.js"
import { Report } from "./report.model.js"

const get_club_id = async (skaterId) =>{
    const club = await BaseAuth.findById(skaterId).select("club");
    console.log(club.club ,"club===")
    return club;
}

const create_report_repositories = async (skaterId, data , club) => {
    console.log(skaterId, data , club,"===========================")
    const report = await Report.create({
        complainedBy: skaterId,
        ownClub: club,
        reportType: data.reportType,
        message: data.message,
        clubName: data.clubName,
        krsaId: data.krsaId
    })
    console.log(report  ,"report====")
}

export {
    get_club_id,
    create_report_repositories,
}