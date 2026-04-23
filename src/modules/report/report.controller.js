import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js"
import { create_report_service, get_skater_report_service, getClubReportsSkater, getDistrictReportsSkater, getStateReportsSkater, inProgressClubReportsServices, resolveClubReportsServices, resolveDistrictReportsServices, update_status_service } from "./report.service.js";

const createReport = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await create_report_service(id, req.body);
    return res.status(200).json(
        new ApiResponse(200, null, "report created successfully")
    )
})

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;
    await update_status_service(id, status);

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
    const id = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const result = await getClubReportsSkater(id, page, limit);

    const reports = result.data.map((item) => ({
        complainedBy: item.complainedBy?.fullName ?? "",
        reportType: item.reportType ?? "",
        message: item.message ?? "",
        clubName: item.clubName ?? "",
        skaterName: item.skaterName ?? "",
        districtName: item.districtName ?? "",
        krsaId: item.krsaId ?? "",
        status: item.status ?? "",
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

const getDistrictReports = asyncHandler(async (req, res) => {
    const id = req.user._id;

    const data = await getDistrictReportsSkater(id);



    return res.status(200).json(
        new ApiResponse(200, reports, "District report display successfully") // ✅ FIXED
    );
});

const getStateReports = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const report = await getStateReportsSkater(id);
    return res.status(200).json(
        new ApiResponse(200, report, "State report display successfully")
    );
})

export const resolveClubReports = asyncHandler(async (req, res) => {
    const clubId = req.user._id;
    const {id} = req.params;
    await resolveClubReportsServices(id, clubId)
    return res.status(200).json(
        new ApiResponse(200, null, "Resolve club successfully")
    )
})

export const inProgressClubReports = asyncHandler(async (req, res) => {
    const clubId = req.user._id;
    const { id } = req.params;
    await inProgressClubReportsServices(id, clubId);
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
    getDistrictReports,
    getStateReports
}