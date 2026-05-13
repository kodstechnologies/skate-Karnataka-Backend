import { AppError } from "../../util/common/AppError.js";
import { paginate } from "../../util/common/paginate.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { create_report_repositories, get_club_id, get_skater_report_repositories, getClubReportsRepositories, getDistrictReportsRepositories, getStateReportsRepositories, inProgressClubReportsRepositories, resolveClubReportsRepositories, resolveDistrictReportsRepositories, resolveStateReportsRepositories, updateClubReportClubRepositories, updateDistrictReportDistrictRepositories, updateStateReportStateRepositories, update_status_repositories } from "./report.repositories.js";

/** Club document _id used on Report.ownClub — not always the same as the logged-in BaseAuth id for club accounts. */
export const resolveClubDocumentIdForReports = async (user) => {
    if (!user?._id) return null;
    const role = (user.role || "").toLowerCase();

    if (role === "skater") {
        return user.club ?? null;
    }

    if (role === "club") {
        const club = await Club.findOne({
            $or: [{ _id: user._id }, { members: user._id }],
        })
            .select("_id")
            .lean();
        return club?._id ?? null;
    }

    return null;
};

/** District document _id for clubs in that district (member token or district id on user). */
export const resolveDistrictDocumentIdForReports = async (user) => {
    if (!user?._id) return null;
    const role = (user.role || "").toLowerCase();
    if (role !== "district") return null;

    const or = [{ _id: user._id }, { members: user._id }];
    if (user.district) {
        or.push({ _id: user.district });
    }

    const district = await District.findOne({ $or: or }).select("_id").lean();
    return district?._id ?? null;
};

export const getDistrictReportsForUser = async (user, page, limit) => {
    const districtDocId = await resolveDistrictDocumentIdForReports(user);
    if (!districtDocId) {
        const { limit: perPage, page: currentPage } = paginate(page, limit);
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
    return getDistrictReportsRepositories(districtDocId, page, limit);
};

export const updateDistrictReportDistrictService = async (user, { reportId, status, districtStatus, message }) => {
    const role = (user.role || "").toLowerCase();
    if (role !== "district") {
        throw new AppError("Only district accounts can update district report status", 403);
    }

    const districtDocId = await resolveDistrictDocumentIdForReports(user);
    if (!districtDocId) {
        throw new AppError("District not found or you are not linked to a district", 404);
    }

    const clubIds = await Club.find({ district: districtDocId }).distinct("_id");
    if (!clubIds.length) {
        throw new AppError("No clubs linked to this district", 404);
    }

    const payload = {};
    if (status !== undefined) {
        payload.status = status;
    }
    if (districtStatus !== undefined) {
        payload.districtStatus = districtStatus;
    }
    if (message !== undefined) {
        payload.districtMessage = message;
    }

    return updateDistrictReportDistrictRepositories(reportId, clubIds, payload);
};

export const getClubReportsForUser = async (user, page, limit) => {
    const clubDocId = await resolveClubDocumentIdForReports(user);
    if (!clubDocId) {
        const { limit: perPage, page: currentPage } = paginate(page, limit);
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
    return getClubReportsRepositories(clubDocId, page, limit);
};

export const updateClubReportClubService = async (user, { reportId, clubStatus, message }) => {
    const role = (user.role || "").toLowerCase();
    if (role !== "club") {
        throw new AppError("Only club accounts can update club report status", 403);
    }

    const clubDocId = await resolveClubDocumentIdForReports(user);
    if (!clubDocId) {
        throw new AppError("Club not found or you are not linked to a club", 404);
    }

    const payload = { clubStatus };
    if (message !== undefined) {
        payload.clubMessage = message;
    }

    return updateClubReportClubRepositories(reportId, clubDocId, payload);
};

const create_report_service = async (skaterId, data) => {
    const club = await get_club_id(skaterId);
    await create_report_repositories(skaterId, data, club);
}

const update_status_service = async (id, status) => {
    await update_status_repositories(id, status);
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

export const getStateReportsForUser = async (user, page, limit) => {
    const role = (user.role || "").toLowerCase();
    if (!["state", "admin"].includes(role)) {
        throw new AppError("Only State or Admin can view state reports", 403);
    }
    return getStateReportsRepositories(page, limit);
};

export const updateStateReportStateService = async (user, { reportId, stateStatus, message }) => {
    const role = (user.role || "").toLowerCase();
    if (!["state", "admin"].includes(role)) {
        throw new AppError("Only State or Admin can update state report status", 403);
    }

    const payload = { StateStatus: stateStatus };
    if (message !== undefined) {
        payload.stateMessage = message;
    }

    return updateStateReportStateRepositories(reportId, payload);
};

export const resolveClubReportsServices = async (id, clubId) => {
    await resolveClubReportsRepositories(id, clubId);
}

export const inProgressClubReportsServices = async (id, clubId) => {
    await inProgressClubReportsRepositories(id, clubId);
}

export const resolveDistrictReportsServices = async (id) => {
    await resolveDistrictReportsRepositories(id);
}

export const resolveStateReportsServices = async (id) => {
    await resolveStateReportsRepositories(id);
}

export {
    create_report_service,
    update_status_service,
    get_skater_report_service,
}