import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { allClubService, createClubService, deleteClubSchema, displaySingleClubService, updateClubDetailsService } from "./club.service.js";

const displayAllClubs = asyncHandler(async (req, res) => {
    const { districtId } = req.params;   // ✅ correct extraction

    const clubs = await allClubService(districtId);

    return res.status(200).json(
        new ApiResponse(
            200,
            clubs,
            "All clubs fetched successfully"
        )
    );
});

const createNewClub = asyncHandler(async (req, res) => {
    await createClubService(req.body);
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Club created Successfully"
        )
    )
})

const displaySingleClub = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const clubDetails = await displaySingleClubService(id);
    return res.status(200).json(
        new ApiResponse(
            200,
            clubDetails,
            "Display single club detail"
        )
    )
})

const updateClub = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await updateClubDetailsService(req.body, id);
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Update club details"
        )
    )
})

const deleteClub = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await deleteClubSchema(id);
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Club deleted Successfully"
        )
    )
})

export {
    displayAllClubs,
    createNewClub,
    displaySingleClub,
    updateClub,
    deleteClub
}