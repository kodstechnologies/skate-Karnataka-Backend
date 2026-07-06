import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormSchoolService, displayAllSchoolService, displaySchoolFullDetailsService } from "./school.services.js";
import { normalizeSchoolFormPayload } from "./schoolFormPayload.js";

const afterLoginSchoolForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = normalizeSchoolFormPayload(req.body);
    const result = await afterLoginFormSchoolService(payload, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "School form submitted successfully"
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

const displaySchoolFullDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const school = await displaySchoolFullDetailsService(id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                school,
                "School full details fetched successfully"
            )
        );
});

export {
    afterLoginSchoolForm,
    displayAllSchool,
    displaySchoolFullDetails,
}