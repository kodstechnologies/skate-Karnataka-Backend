import mongoose from "mongoose";
import { paginate } from "../../util/common/paginate.js";
import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js"
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { Report } from "./report.model.js";

/** Reports appear at state only after this many ms since createdAt (30 calendar days window). */
const STATE_REPORT_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const get_club_id = async (skaterId) => {
    const club = await BaseAuth.findById(skaterId).select("club");
    // console.log(club.club ,"club===")
    return club;
}

const create_report_repositories = async (skaterId, data, club) => {
    return await Report.create({
        complainedBy: skaterId,
        ownClub: club?.club,
        reportType: data?.reportType || "",
        message: data?.message || "",
        clubName: data?.clubName || "",
        skaterName: data?.skaterName || "",
        districtName: data?.districtName || "",
        krsaId: data?.krsaId || "",
    });
};



const update_status_repositories = async (id, status) => {
    const updated = await Report.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found", 404);
    }

    return updated;
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


export const updateClubReportClubRepositories = async (reportId, clubDocId, { clubStatus, clubMessage }) => {
    const $set = { clubStatus };
    if (clubMessage !== undefined) {
        $set.clubMessage = clubMessage;
    }

    const updated = await Report.findOneAndUpdate(
        { _id: reportId, ownClub: clubDocId },
        { $set },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found for this club", 404);
    }

    return updated;
};

export const getClubReportsRepositories = async (clubId, page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = {
        ownClub: new mongoose.Types.ObjectId(clubId),
        status: { $ne: "solved" } // Exclude solved reports
    };

    const data = await Report.find(query)
        .select(
            "reportType message clubName skaterName districtName krsaId status clubStatus clubMessage complainedBy"
        )
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
/** Reports for clubs in this district; excludes skater-marked solved. */
export const getDistrictReportsRepositories = async (districtDocId, page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const districtObjectId = new mongoose.Types.ObjectId(districtDocId);
    const district = await District.findById(districtObjectId).select("name").lean();

    const districtScope = [{ "clubDoc.district": districtObjectId }];
    if (district?.name) {
        districtScope.push({ districtName: district.name });
    }

    const baseMatch = {
        status: { $ne: "solved" },
        $or: districtScope,
    };

    const lookupStages = [
        {
            $lookup: {
                from: Club.collection.name,
                localField: "ownClub",
                foreignField: "_id",
                as: "clubDoc",
            },
        },
        { $unwind: "$clubDoc" },
        { $match: baseMatch },
    ];

    const [totalResult, data] = await Promise.all([
        Report.aggregate([...lookupStages, { $count: "total" }]),
        Report.aggregate([
            ...lookupStages,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perPage },
            {
                $lookup: {
                    from: BaseAuth.collection.name,
                    localField: "complainedBy",
                    foreignField: "_id",
                    as: "complainedByUser",
                },
            },
            {
                $addFields: {
                    complainedBy: {
                        $arrayElemAt: ["$complainedByUser", 0],
                    },
                },
            },
            {
                $project: {
                    reportType: 1,
                    message: 1,
                    clubName: 1,
                    skaterName: 1,
                    districtName: 1,
                    krsaId: 1,
                    status: 1,
                    districtStatus: 1,
                    districtMessage: 1,
                    clubStatus: 1,
                    clubMessage: 1,
                    complainedBy: { fullName: "$complainedBy.fullName" },
                    createdAt: 1,
                },
            },
        ]),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: Math.ceil(total / perPage) || 0,
        },
    };
};

/** Admin / state: all non-solved reports for clubs linked to any district. */
export const getAllDistrictScopeReportsRepositories = async (page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const clubIds = await Club.find({
        district: { $exists: true, $ne: null },
    }).distinct("_id");

    if (!clubIds.length) {
        return {
            data: [],
            pagination: {
                total: 0,
                page: currentPage,
                limit: perPage,
                totalPages: 0,
            },
        };
    }

    const query = {
        ownClub: { $in: clubIds },
        status: { $ne: "solved" },
    };

    const data = await Report.find(query)
        .select(
            "reportType message clubName skaterName districtName krsaId status districtStatus districtMessage clubStatus clubMessage complainedBy createdAt"
        )
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

export const updateDistrictReportDistrictRepositories = async (
    reportId,
    districtClubIds,
    { status, districtStatus, districtMessage }
) => {
    const $set = {};
    if (status !== undefined) {
        $set.status = status;
    }
    if (districtStatus !== undefined) {
        $set.districtStatus = districtStatus;
    }
    if (districtMessage !== undefined) {
        $set.districtMessage = districtMessage;
    }

    const updated = await Report.findOneAndUpdate(
        { _id: reportId, ownClub: { $in: districtClubIds } },
        { $set },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found for this district", 404);
    }

    return updated;
};

/** All jurisdictions (single-state app); created ≥30 days ago; not skater-solved. Schema uses StateStatus. */
export const getStateReportsRepositories = async (page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const cutoff = new Date(Date.now() - STATE_REPORT_MIN_AGE_MS);

    const query = {
        status: { $ne: "solved" },
        createdAt: { $lte: cutoff },
    };

    const data = await Report.find(query)
        .select(
            "reportType message clubName skaterName districtName krsaId status clubStatus districtStatus StateStatus clubMessage districtMessage stateMessage complainedBy createdAt"
        )
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

export const updateStateReportStateRepositories = async (reportId, { StateStatus, stateMessage }) => {
    const $set = { StateStatus };
    if (stateMessage !== undefined) {
        $set.stateMessage = stateMessage;
    }

    const updated = await Report.findByIdAndUpdate(
        reportId,
        { $set },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError("Report not found", 404);
    }

    return updated;
};

export const resolveClubReportsRepositories = async (id, clubId) => {
    const updated = await Report.findOneAndUpdate(
        { _id: id, ownClub: clubId },
        {
            $set: {
                status: "solved",
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