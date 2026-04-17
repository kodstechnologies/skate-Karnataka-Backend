import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js"
import { create_report_service, get_skater_report_service, solve_report_service } from "./report.service.js";

const createReport = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await create_report_service(id, req.body);
    return res.status(200).json(
        new ApiResponse(200, null, "report created successfully")
    )
})

const solvedReport = asyncHandler(async (req, res) => {
    // const 
    const id = req.user._id;
    await solve_report_service(id);
    return res.status(200).json(
        new ApiResponse(200, null, "resolve")
    )

})

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

})

const getDistrictReports = asyncHandler(async (req, res) => {

})

const getStateReports = asyncHandler(async (req, res) => {

})


export {
    createReport,
    solvedReport,
    getSkaterReports,
    getClubReports,
    getDistrictReports,
    getStateReports
}