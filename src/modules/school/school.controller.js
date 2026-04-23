import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormSchoolService, displayAllSchoolService } from "./school.services.js";

const afterLoginSchoolForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormSchoolService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Parent from submitted successfully"
            )
        )
})

const displayAllSchool = asyncHandler(async (req, res) => {
    const schools = await displayAllSchoolService(req.query);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                schools,
                "Schools fetched successfully"
            )
        )
});

export {
    afterLoginSchoolForm,
    displayAllSchool,
}