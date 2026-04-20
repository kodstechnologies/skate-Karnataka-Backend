import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { allClubService, apply_club_service, apply_leave_service, approve_join_club_service, approve_leave_club_service, clubsByUserDistrictService, createClubService, deleteClubSchema, display_existing_club_service, displaySingleClubService, updateClubDetailsService } from "./club.service.js";

const displayAllClubs = asyncHandler(async (req, res) => {
    const { id } = req.params;   // ✅ correct extraction
    const { page, limit } = req.query;
    const clubs = await allClubService(id, page, limit);
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
    console.log(req.body, "====")
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

    const formattedClubDetails = {
        id: String(clubDetails._id),
        district: clubDetails.district,
        districtName: clubDetails.districtName,
        name: clubDetails.name,
        img: clubDetails.img || "",
        address: clubDetails.address || "",
        about: clubDetails.about || "",
        skaters: clubDetails.skaters ?? 0,
        rank: clubDetails.rank ?? 0,
        championships: clubDetails.championships ?? 0,
        clubId: clubDetails.clubId || "",
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            formattedClubDetails,
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

const apply_club = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userID = req.user._id;
    await apply_club_service(id, userID);
    return res.status(200).json(
        new ApiResponse(200, null, "Club apply successfully")
    )
})

const approve_join_club = asyncHandler(async (req, res) => {
    const userID = req.user._id;
    await approve_join_club_service(userID);
    return res.status(200).json(new ApiResponse(200, null, "Club approve successfully"));
})

const apply_leave = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await apply_leave_service(userId);
    return res.status(200).json(new ApiResponse(200, null, "Club leave apply successfully"));
})

const approve_leave_club = asyncHandler(async (req, res) => {
    await approve_leave_club_service();
    return res.status(200).json(new ApiResponse(200, null, "Club approve successfully"));
})

const display_existing_club = asyncHandler(async (req, res) => {
    const id = req.user._id;

    const existingClub = await display_existing_club_service(id);

    if (!existingClub) {
        return res.status(404).json({
            message: "Club not found",
        });
    }
    console.log(existingClub, "---")
    const clubDetails = {
        img: existingClub?.club?.img || "",
        name: existingClub?.club?.name || "",
        clubId: existingClub?.club?.clubId || "",
        districtName: existingClub?.club?.districtName || "",
        address: existingClub?.club?.address || "",
        medals: existingClub?.club?.championships || "", // mapped
        clubRank: existingClub?.club?.rank || "",        // mapped
        about: existingClub?.club?.about || "",
    };

    return res
        .status(200)
        .json(new ApiResponse(200, clubDetails, "Club details fetched successfully"));
});

export {
    displayAllClubs,
    createNewClub,
    displaySingleClub,
    updateClub,
    deleteClub,
    display_all_Club_basedOn_user_district,
    apply_club,
    approve_join_club,
    apply_leave,
    approve_leave_club,
    display_existing_club,
}