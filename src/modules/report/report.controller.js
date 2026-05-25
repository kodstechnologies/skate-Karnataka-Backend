import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js"
import { create_report_service, get_skater_report_service, getClubReportsForUser, getDistrictReportsForUser, getStateReportsForUser, inProgressClubReportsServices, resolveClubDocumentIdForReports, resolveClubReportsServices, resolveDistrictReportsServices, updateClubReportClubService, updateDistrictReportDistrictService, updateStateReportStateService, update_status_service } from "./report.service.js";

const createReport = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await create_report_service(id, req.body);
    return res.status(200).json(
        new ApiResponse(200, null, "report created successfully")
    )
})

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    await update_status_service(req.user._id, id, status);

    const message =
        status === "solved"
            ? "Report is solved"
            : status === "pending"
                ? "Report is pending"
                : "Report is unsolved";

    return res.status(200).json(
        new ApiResponse(200, null, message)
    );
});

const getSkaterReports = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, reportType } = req.query;
    const id = req.user._id;
    const report = await get_skater_report_service(
        id,
        page,
        limit,
        status,
        reportType
    );

    return res.status(200).json(
        new ApiResponse(200, report, "Report display successfully")
    );
});

const getClubReports = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const result = await getClubReportsForUser(req.user, page, limit);

    const reports = result.data.map((item) => ({
        id: item._id,
        complainedBy: item.complainedBy?.fullName ?? "",
        reportType: item.reportType ?? "",
        message: item.message ?? "",
        clubName: item.clubName ?? "",
        skaterName: item.skaterName ?? "",
        districtName: item.districtName ?? "",
        krsaId: item.krsaId ?? "",
        status: item.status ?? "",
        clubStatus: item.clubStatus ?? "pending",
        clubMessage: item.clubMessage ?? "",
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                reports,
                pagination: result.pagination, // ✅ include pagination
            },
            "Club report display successfully"
        )
    );
});

const updateClubReport = asyncHandler(async (req, res) => {
    const { id: reportId } = req.params;
    const { clubStatus, message } = req.body;
    const updated = await updateClubReportClubService(req.user, {
        reportId,
        clubStatus,
        message,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                id: updated._id,
                clubStatus: updated.clubStatus,
                clubMessage: updated.clubMessage ?? "",
            },
            "Club report updated successfully"
        )
    );
});

const getDistrictReports = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await getDistrictReportsForUser(req.user, page, limit);

    const reports = result.data.map((item) => ({
        id: item._id,
        complainedBy: item.complainedBy?.fullName ?? "",
        reportType: item.reportType ?? "",
        message: item.message ?? "",
        clubName: item.clubName ?? "",
        skaterName: item.skaterName ?? "",
        districtName: item.districtName ?? "",
        krsaId: item.krsaId ?? "",
        status: item.status ?? "",
        clubStatus: item.clubStatus ?? "pending",
        clubMessage: item.clubMessage ?? "",
        districtStatus: item.districtStatus ?? "pending",
        districtMessage: item.districtMessage ?? "",
        createdAt: item.createdAt,
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                reports,
                pagination: result.pagination,
            },
            "District report display successfully"
        )
    );
});

const updateDistrictReport = asyncHandler(async (req, res) => {
    const { id: reportId } = req.params;
    const { status, districtStatus, message } = req.body;
    const updated = await updateDistrictReportDistrictService(req.user, {
        reportId,
        status,
        districtStatus,
        message,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                id: updated._id,
                status: updated.status ?? "",
                districtStatus: updated.districtStatus,
                districtMessage: updated.districtMessage ?? "",
            },
            "District report updated successfully"
        )
    );
});

const getStateReports = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await getStateReportsForUser(req.user, page, limit);

    const reports = result.data.map((item) => ({
        id: item._id,
        complainedBy: item.complainedBy?.fullName ?? "",
        reportType: item.reportType ?? "",
        message: item.message ?? "",
        clubName: item.clubName ?? "",
        skaterName: item.skaterName ?? "",
        districtName: item.districtName ?? "",
        krsaId: item.krsaId ?? "",
        status: item.status ?? "",
        clubStatus: item.clubStatus ?? "pending",
        districtStatus: item.districtStatus ?? "pending",
        stateStatus: item.StateStatus ?? "pending",
        clubMessage: item.clubMessage ?? "",
        districtMessage: item.districtMessage ?? "",
        stateMessage: item.stateMessage ?? "",
        createdAt: item.createdAt,
    }));

    return res.status(200).json({
        ...new ApiResponse(200, reports, "State report display successfully"),
        pagination: result.pagination,
    });
});

const updateStateReport = asyncHandler(async (req, res) => {
    const { id: reportId } = req.params;
    const { stateStatus, message } = req.body;
    const updated = await updateStateReportStateService(req.user, {
        reportId,
        stateStatus,
        message,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                id: updated._id,
                stateStatus: updated.StateStatus ?? "pending",
                stateMessage: updated.stateMessage ?? "",
            },
            "State report updated successfully"
        )
    );
});

export const resolveClubReports = asyncHandler(async (req, res) => {
    const clubDocId = await resolveClubDocumentIdForReports(req.user);
    if (!clubDocId) {
        throw new AppError("Club not found or you are not linked to a club", 404);
    }
    const {id} = req.params;
    await resolveClubReportsServices(id, clubDocId)
    return res.status(200).json(
        new ApiResponse(200, null, "Resolve club successfully")
    )
})

export const inProgressClubReports = asyncHandler(async (req, res) => {
    const role = (req.user.role || "").toLowerCase();
    let clubDocId = req.user._id;
    if (role === "club") {
        clubDocId = await resolveClubDocumentIdForReports(req.user);
        if (!clubDocId) {
            throw new AppError("Club not found or you are not linked to a club", 404);
        }
    }
    const { id } = req.params;
    await inProgressClubReportsServices(id, clubDocId);
    return res.status(200).json(
        new ApiResponse(200, null, "Club report moved to inprogress successfully")
    );
});
export const resolveDistrictReports = asyncHandler(async (req, res) => {
      const id = req.user._id;
    await resolveDistrictReportsServices(id)
    return res.status(200).json(
        new ApiResponse(200, null, "Resolve district successfully")
    )
})
export const resolveStateReports = asyncHandler(async (req, res) => {
      const id = req.user._id;
    await resolveStateReportsServices(id)
    return res.status(200).json(
        new ApiResponse(200, null, "Resolve state successfully")
    )
})

export {
    createReport,
    updateStatus,
    getSkaterReports,
    getClubReports,
    updateClubReport,
    getDistrictReports,
    updateDistrictReport,
    getStateReports,
    updateStateReport
}