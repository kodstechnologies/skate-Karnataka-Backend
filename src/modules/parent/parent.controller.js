import { asyncHandler } from "../../util/common/asyncHandler.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import { afterLoginFormParentService, displayAllParentService } from "./parent.services.js";

const afterLoginParentForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormParentService(req.body, id);
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

const displayAllParent = asyncHandler(async (req, res) => {
    const parents = await displayAllParentService(req.query);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                parents,
                "Parents fetched successfully"
            )
        )
});

export {
    afterLoginParentForm,
    displayAllParent,
}