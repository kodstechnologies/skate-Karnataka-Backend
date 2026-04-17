import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js"
import { create_report_service } from "./report.service.js";

const createReport = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await create_report_service(id, req.body);
    return res.status(200).json(
        new ApiResponse(200, null, "report created successfully")
    )
})

const solvedReport = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await solve_report_service(id);

})

const getUserReports = asyncHandler(async (req, res) => {

})

const getClubReports = asyncHandler(async (req, res) => {

})

const getDistrictReports = asyncHandler(async (req, res) => {

})

const getStateReports = asyncHandler(async (req, res) => {

})


export {
    createReport,
    solvedReport,
    getUserReports,
    getClubReports,
    getDistrictReports,
    getStateReports
}