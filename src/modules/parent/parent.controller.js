import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormParentService } from "./parent.services.js";

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

export {
    afterLoginParentForm,
}