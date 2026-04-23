import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    afterLoginFormClubService,
    displayAllAcademyService,
    displayFullDetailsOfAcademyService,
} from "./academy.service.js";

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

const displayAllAcademy = asyncHandler(async (req, res) => {
    const result = await displayAllAcademyService(req.query);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Academies fetched successfully"
            )
        );
});

export const displayFullDetailsOfAcademy = asyncHandler(async(req,res)=> {
    const { id } = req.params;
    const result = await displayFullDetailsOfAcademyService(id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Academy full details fetched successfully"
            )
        );
});

export {
    afterLoginClubForm,
    displayAllAcademy,
}