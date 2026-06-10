import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    afterLoginFormClubService,
    displayAllAcademyService,
    displayFullDetailsOfAcademyService,
} from "./academy.service.js";
import { afterLoginFormOfficialService } from "../official/official.services.js";
import { isOfficialFormPayload } from "../official/officialFormPayload.js";

const afterLoginClubForm = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isOfficialFormPayload(req.body)) {
        const updated = await afterLoginFormOfficialService(req.body, id);
        return res.status(200).json(
            new ApiResponse(
                200,
                { id: updated?._id, verify: updated?.verify === true },
                "Official form submitted successfully"
            )
        );
    }

    const updated = await afterLoginFormClubService(req.body, id);
    return res.status(200).json(
        new ApiResponse(
            200,
            { id: updated?._id, verify: updated?.verify === true },
            "Club form submitted successfully"
        )
    );
});

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