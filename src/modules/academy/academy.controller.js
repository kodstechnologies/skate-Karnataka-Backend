import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormClubService } from "./academy.service.js";

const afterLoginClubForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(req.body, "body");
    await afterLoginFormClubService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Club from submitted successfully"
            )
        )
})

export {
    afterLoginClubForm,
}