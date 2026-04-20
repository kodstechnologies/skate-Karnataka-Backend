import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormGuestService } from "./guest.services.js";

const afterLoginGuestForm = asyncHandler(async (req, res) => {
    console.log(req.body, "jjj")
    const { id } = req.params;
    await afterLoginFormGuestService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Guest from submitted successfully"
            )
        )
})

export {
    afterLoginGuestForm,
}