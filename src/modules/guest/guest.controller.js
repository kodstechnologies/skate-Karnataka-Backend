import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { addContactUsService, afterLoginFormGuestService, displayContactUsService } from "./guest.services.js";

export const afterLoginGuestForm = asyncHandler(async (req, res) => {
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


export const displayContactUs = asyncHandler(async (req, res) => {
    const result = await displayContactUsService();
    return res.status(200).json(new ApiResponse(
        200, result, "Display contact us"
    ))
})

export const addContactUs = asyncHandler(async (req, res) => {
    await addContactUsService(req.body)

    return res.status(200).json(new ApiResponse(
        200, null, "Add contact us successfully"
    ))
})