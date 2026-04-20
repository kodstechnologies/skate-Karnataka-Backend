import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormSchoolService } from "./school.services.js";

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

export {
    afterLoginSchoolForm,
}