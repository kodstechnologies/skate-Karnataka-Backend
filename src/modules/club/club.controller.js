import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { allClubService, clubsByUserDistrictService, createClubService, deleteClubSchema, displaySingleClubService, updateClubDetailsService } from "./club.service.js";

const displayAllClubs = asyncHandler(async (req, res) => {
    const { id } = req.params;   // ✅ correct extraction

    const clubs = await allClubService(id);
    console.log(clubs, "---")
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

const display_all_Club_basedOn_user_district = asyncHandler(async (req, res) => {
    const user = req.user;
    console.log(user,"--------")
    if (!user) {
        throw new AppError("User not authenticated", 401);
    }

    const { page, limit } = req.query;
    const result = await clubsByUserDistrictService(user, {
        page,
        limit: limit ?? 5,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Clubs in your district fetched successfully"
        )
    );
});

export {
    displayAllClubs,
    createNewClub,
    displaySingleClub,
    updateClub,
    deleteClub,
    display_all_Club_basedOn_user_district
}