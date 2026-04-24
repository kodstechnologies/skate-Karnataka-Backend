import mongoose from "mongoose";
import { paginate } from "../../util/common/paginate.js";
import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js"
import { Report } from "./report.model.js"

const get_club_id = async (skaterId) => {
    const club = await BaseAuth.findById(skaterId).select("club");
    // console.log(club.club ,"club===")
    return club;
}

const create_report_repositories = async (skaterId, data, club) => {
    console.log(skaterId, data, club, "===========================")
    const report = await Report.create({
        complainedBy: skaterId,
        ownClub: club.club,
        reportType: data?.reportType || "",
        message: data?.message || "",
        clubName: data?.clubName || "",
        skaterName: data?.skaterName || "",
        districtName: data?.districtName || "",
        krsaId: data?.krsaId || "",

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


export const getClubReportsRepositories = async (clubId, page, limit) => {
    console.log(clubId, "====");

    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = {
        ownClub: new mongoose.Types.ObjectId(clubId),
        status: { $ne: "solved" } // Exclude solved reports
    };

    const data = await Report.find(query)
        .select("reportType message clubName skaterName districtName krsaId status complainedBy")
        .populate("complainedBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean();

    const total = await Report.countDocuments(query);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: Math.ceil(total / perPage),
        },
    };
};
export const getDistrictReportsRepositories = async (id) => {

}

export const getStateReportsRepositories = async (id) => {

}

export const resolveClubReportsRepositories = async (id, clubId) => {
    const updated = await Report.findOneAndUpdate(
        { _id: id, ownClub: clubId },
        {
            $set: {
                status: "solved",
                idClub: true,
                statusUpdatedAt: new Date(),
            },
        },
        { new: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found for this club", 404);
    }

    return updated;
}

export const inProgressClubReportsRepositories = async (id, clubId) => {
    const updated = await Report.findOneAndUpdate(
        { _id: id, ownClub: clubId },
        {
            $set: {
                status: "inprogress",
                statusUpdatedAt: new Date(),
            },
        },
        { new: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found for this club", 404);
    }

    return updated;
}

export const resolveDistrictReportsRepositories = async (id) => {

}

export const resolveStateReportsRepositories = async (id) => {

}

export {
    get_club_id,
    create_report_repositories,
    get_skater_report_repositories,
    update_status_repositories,
    // inProgressClubReportsRepositories,
}