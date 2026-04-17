import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js"
import { Report } from "./report.model.js"

const get_club_id = async (skaterId) => {
    const club = await BaseAuth.findById(skaterId).select("club");
    // console.log(club.club ,"club===")
    return club;
}

const create_report_repositories = async (skaterId, data, club) => {
    // console.log(skaterId, data , club,"===========================")
    const report = await Report.create({
        complainedBy: skaterId,
        ownClub: club,
        reportType: data?.reportType || "",
        message: data?.message || "",
        clubName: data?.clubName || "",
        skaterName: data?.skaterName || "",
        districtName: data?.districtName || "",
        krsaId: data?.krsaId || ""
    })
    // console.log(report  ,"report====")
}



const update_status_repositories = async (id, status) => {
    const solveReport = await Report.updateMany(
        { id },
        {
            status
        }
    );

};

const get_skater_report_repositories = async (
    id,
    page,
    limit,
    status,
    reportType
) => {
    const { skip, limit: perPage } = paginate(page, limit);

    const filter = {};

    // optional: filter by user (if needed)
    if (id) filter.complainedBy = id;

    if (status) filter.status = status;
    if (reportType) filter.reportType = reportType;

    const total = await Report.countDocuments(filter);

    const reports = await Report.find(filter)
        .skip(skip)
        .limit(perPage)
        .sort({ createdAt: -1 });

    return {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / perPage),
        data: reports
    };
};

export {
    get_club_id,
    create_report_repositories,
    get_skater_report_repositories,
    update_status_repositories,
}