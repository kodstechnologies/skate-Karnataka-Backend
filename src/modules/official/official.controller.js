import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormOfficialService } from "./official.services.js";

const afterLoginOfficialForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormOfficialService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Official from submitted successfully"
            )
        )
})

export {
    afterLoginOfficialForm,
}