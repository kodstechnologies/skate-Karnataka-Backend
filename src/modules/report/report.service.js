import { AppError } from "../../util/common/AppError.js";
import { buildPaginationMeta, paginate } from "../../util/common/paginate.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { Skater } from "../skater/skater.model.js";
import { create_report_repositories, get_club_id, get_skater_report_repositories, getAllDistrictScopeReportsRepositories, getClubReportsRepositories, getDistrictReportsRepositories, getStateReportsRepositories, inProgressClubReportsRepositories, resolveClubReportsRepositories, resolveDistrictReportsRepositories, resolveStateReportsRepositories, updateClubReportClubRepositories, updateDistrictReportDistrictRepositories, updateStateReportStateRepositories, update_status_repositories } from "./report.repositories.js";
import {
    notifyClubOnNewReport,
    notifyReportResolvedBySkater,
    notifySkaterOnClubReportUpdate,
    notifySkaterOnDistrictReportUpdate,
    notifySkaterOnStateReportUpdate,
} from "./report.notifications.js";

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
    const role = (user.role || "").toLowerCase();

    if (role === "admin" || role === "state") {
        return getAllDistrictScopeReportsRepositories(page, limit);
    }

    const districtDocId = await resolveDistrictDocumentIdForReports(user);
    if (!districtDocId) {
        const { limit: perPage, page: currentPage } = paginate(page, limit);
        return {
            data: [],
            pagination: buildPaginationMeta({
                total: 0,
                page: currentPage,
                limit: perPage,
            }),
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

    const updated = await updateDistrictReportDistrictRepositories(
        reportId,
        clubIds,
        payload
    );

    if (updated?.complainedBy) {
        await notifySkaterOnDistrictReportUpdate({
            report: updated,
            sentBy: user._id,
            districtStatus: updated.districtStatus,
            message: updated.districtMessage ?? message,
        });
    }

    return updated;
};

export const getClubReportsForUser = async (user, page, limit) => {
    const clubDocId = await resolveClubDocumentIdForReports(user);
    if (!clubDocId) {
        const { limit: perPage, page: currentPage } = paginate(page, limit);
        return {
            data: [],
            pagination: buildPaginationMeta({
                total: 0,
                page: currentPage,
                limit: perPage,
            }),
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

    const updated = await updateClubReportClubRepositories(reportId, clubDocId, payload);

    if (updated?.complainedBy) {
        notifySkaterOnClubReportUpdate({
            report: updated,
            sentBy: user._id,
            clubStatus: updated.clubStatus,
        }).catch((err) => {
            console.error("Club report skater notify failed:", err?.message || err);
        });
    }

    return updated;
};

const SKATER_IN_CLUB_STATUSES = ["join", "apply-leave"];

const create_report_service = async (skaterId, data) => {
    const skater = await Skater.findById(skaterId).select("club clubStatus").lean();

    if (
        !skater?.club ||
        !SKATER_IN_CLUB_STATUSES.includes(String(skater.clubStatus || ""))
    ) {
        throw new AppError("First join any club", 400);
    }

    const club = await get_club_id(skaterId);
    const report = await create_report_repositories(skaterId, data, club);

    if (report?.ownClub) {
        notifyClubOnNewReport({ report, sentBy: skaterId }).catch((err) => {
            console.error("New report club notify failed:", err?.message || err);
        });
    }

    return report;
};

const update_status_service = async (skaterId, id, status) => {
    const updated = await update_status_repositories(id, status);

    if (status === "solved") {
        notifyReportResolvedBySkater({ report: updated, sentBy: skaterId }).catch(
            (err) => {
                console.error(
                    "Report solved escalation notify failed:",
                    err?.message || err
                );
            }
        );
    }

    return updated;
};

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

    const updated = await updateStateReportStateRepositories(reportId, payload);

    if (updated?.complainedBy) {
        notifySkaterOnStateReportUpdate({
            report: updated,
            sentBy: user._id,
            stateStatus: updated.StateStatus,
        }).catch((err) => {
            console.error("State report skater notify failed:", err?.message || err);
        });
    }

    return updated;
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