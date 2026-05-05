import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { formatDate } from "../../util/time/timeUtil.js";
import { after_login_form_skater_service, deleteUser_skater_service, get_skater_digital_id_card_service, get_skater_profile_service, update_skater_profile_service,  } from "./skater.service.js";

const afterLoginSkaterForm = asyncHandler(async (req, res) => {
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
    console.log(req.user, "===========")
    const id = req.user._id;
    console.log(id, "==id")
    const profile = await get_skater_profile_service(id);
    const response = {
        img: profile?.photo || "",
        name: profile?.fullName || "",
        krsaId: profile?.krsaId || "",
        discipline: profile?.discipline || "",
        stateRank: profile?.stateRank || 0,     //working ...
        goldMedals: profile?.goldMedals || 0,   //working ...
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
        dob: profile.dob ? formatDate(profile.dob) : "",
        category: profile?.category?.typeName || "",
        clubName: profile?.club?.name || "",
        date : profile?.createdAt ? formatDate(profile.createdAt) : "", 
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

export {
afterLoginSkaterForm,
GetSkaterProfile,
GetSkaterDigitalIdCard,
UpdateSkaterProfile,
DeleteSkater,
}