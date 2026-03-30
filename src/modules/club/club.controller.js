import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { allClubService, createClubService } from "./club.service.js";

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

})

const updateClub = asyncHandler(async (req, res) => {

})

const deleteClub = asyncHandler(async (req, res) => {

})

export {
    displayAllClubs,
    createNewClub,
    displaySingleClub,
    updateClub,
    deleteClub
}