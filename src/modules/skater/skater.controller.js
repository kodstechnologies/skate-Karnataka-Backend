import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { formatDate, formatDob } from "../../util/time/timeUtil.js";
import { after_login_form_skater_service, deleteUser_skater_service, get_all_discipline_service, get_all_skating_event_categories_full_service, get_all_skating_event_categories_service, get_skater_digital_id_card_service, get_skater_profile_service, get_skater_results_event_service, get_skater_results_service, update_skater_profile_service } from "./skater.service.js";

const afterLoginSkaterForm = asyncHandler(async (req, res) => {
    // console.log("🚀 ~ req.body:", req.body)
    const { id } = req.params;
    await after_login_form_skater_service(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Skater form submitted successfully"
            )
        )
})

const GetSkaterProfile = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const profile = await get_skater_profile_service(id);
    const response = {
        img: profile?.photo || "",
        name: profile?.fullName || "",
        krsaId: profile?.krsaId || "",
        category: profile?.category?.typeName || "",
        discipline: profile?.disciplineName || profile?.discipline?.name || "",
        stateRank: profile?.stateRank || 0,
        goldMedals: profile?.goldMedals || 0,
    };

    return res.status(200).json(new ApiResponse(200, response, "Skater profile display successfully"))
})

const GetSkaterDigitalIdCard = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const profile = await get_skater_digital_id_card_service(id);
    const response = {
        img: profile?.photo || "",
        name: profile?.fullName || "",
        krsaId: profile?.krsaId || "",
        dob: profile.dob ? formatDob(profile.dob) : "",
        category: profile?.category?.typeName || "",
        discipline: profile?.disciplineName || profile?.discipline?.name || "",
        clubName: profile?.club?.name || "",
        date: profile?.createdAt ? formatDate(profile.createdAt) : "",
    };

    return res.status(200).json(new ApiResponse(200, response, "Skater digital ID generate successfully"))
})

const UpdateSkaterProfile = asyncHandler(async (req, res) => {
    const result = await update_skater_profile_service(req.user, req.body);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "User profile updated successfully"
            )
        );
});
const DeleteSkater = asyncHandler(async (req, res) => {
    console.log("🚀 ~ req.body:", req.user._id)
    const result = await deleteUser_skater_service(req.user);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "User deleted successfully"
            )
        );
});

const GetAllSkatingEventCategories = asyncHandler(async (_req, res) => {
    const categories = await get_all_skating_event_categories_service();
    return res
        .status(200)
        .json(new ApiResponse(200, categories, "Skating categories fetched successfully"));
});

const GetAllSkatingEventCategoriesFull = asyncHandler(async (_req, res) => {
    const categories = await get_all_skating_event_categories_full_service();
    return res
        .status(200)
        .json(
            new ApiResponse(200, categories, "All skating event category records fetched successfully")
        );
});

const getAllDiscipline = asyncHandler(async (_req, res) => {
    const disciplines = await get_all_discipline_service();
    return res
        .status(200)
        .json(new ApiResponse(200, disciplines, "Disciplines fetched successfully"));
});

const GetSkaterResultsEvent = asyncHandler(async (req, res) => {
    const events = await get_skater_results_event_service(req.user._id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                events,
                events.length
                    ? "Registered events fetched successfully"
                    : "No registered events found for this skater"
            )
        );
});

const GetSkaterResults = asyncHandler(async (req, res) => {
    const categoryName = req.query.categoryName || req.query.category;
    const results = await get_skater_results_service(
        req.user._id,
        req.params.id,
        categoryName
    );
    const message = results?.resultsAvailable
        ? "Skater results fetched successfully"
        : "Results are not available yet";
    return res.status(200).json(new ApiResponse(200, results, message));
});

export {
afterLoginSkaterForm,
GetSkaterProfile,
GetSkaterDigitalIdCard,
UpdateSkaterProfile,
DeleteSkater,
GetAllSkatingEventCategories,
GetAllSkatingEventCategoriesFull,
getAllDiscipline,
GetSkaterResultsEvent,
GetSkaterResults,
}