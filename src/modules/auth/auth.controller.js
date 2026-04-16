import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { formatDate } from "../../util/time/timeUtil.js";
import { afterLoginFormClubService, afterLoginFormGuestService, afterLoginFormOfficialService, afterLoginFormParentService, afterLoginFormSchoolService, afterLoginFormSkaterService, ContactSupportService, DeleteUserService, get_skater_digital_id_card_service, get_skater_profile_service, GetDigitalIDCardService, GetUserProfileService, LoginUserService, LogoutUserService, RegisterUserService, sendEmailOTPService, sendPhoneOTPService, ToggleNotificationsService, UpdateUserProfileService, verifyEmailOTPService, VerifyOTPService, verifyPhoneOTPService } from "./auth.service.js";

const RegisterUser = asyncHandler(async (req, res) => {
    const result = await RegisterUserService(req.body);
    // console.log("🚀 ~ result:-----", result)
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                result,
                "User registered successfully"
            )
        );
});

const sendEmailOTP = asyncHandler(async (req, res) => {
    await sendEmailOTPService(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Email OTP sent successfully"
        )
    );
});
const verifyEmailOTP = asyncHandler(async (req, res) => {
    await verifyEmailOTPService(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Email OTP verified successfully"
        )
    );
});

const sendPhoneOTP = asyncHandler(async (req, res) => {
    await sendPhoneOTPService(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Phone OTP sent successfully"
        )
    );
});

const verifyPhoneOTP = asyncHandler(async (req, res) => {
    await verifyPhoneOTPService(req.body);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Phone OTP verified successfully"
        )
    );
});

const LoginUser = asyncHandler(async (req, res) => {
    const result = await LoginUserService(req.body.identifier);
    // console.log("🚀 ~ result:", result)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "User logged in successfully"
            )
        );
});

const VerifyOTP = asyncHandler(async (req, res) => {
    // console.log("🚀 ~ req:", req.body)
    const result = await VerifyOTPService(req.body);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    result, // Don't return user data for security reasons
                },
                "OTP verified successfully"
            )
        );
});
// =================== skater =====================================
const afterLoginSkaterForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormSkaterService(req.body, id);
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
        category: profile?.category || "",   
        clubName: profile?.club?.name || "",
        date : profile?.createdAt ? formatDate(profile.createdAt) : "", 
    };

    return res.status(200).json(new ApiResponse(200, response, "Skater digital ID generate successfully"))
})

// ====================== club ===================
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

const afterLoginParentForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormParentService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Parent from submitted successfully"
            )
        )
})

const afterLoginSchoolForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormSchoolService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Parent from submitted successfully"
            )
        )
})

const afterLoginOfficialForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await afterLoginFormOfficialService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Official from submitted successfully"
            )
        )
})

const RefreshToken = asyncHandler(async (req, res) => { });

const LogoutUser = asyncHandler(async (req, res) => {
    console.log("🚀 ~ req:", req.body)
    const result = await LogoutUserService(req.body);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "User logged out successfully"
            )
        );
});
const UpdateUserProfile = asyncHandler(async (req, res) => {
    const result = await UpdateUserProfileService(req.user, req.body);
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
const DeleteUser = asyncHandler(async (req, res) => {
    console.log("🚀 ~ req.body:", req.user._id)
    const result = await DeleteUserService(req.user);
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
const GetUserProfile = asyncHandler(async (req, res) => {
    const result = await GetUserProfileService(req.user);
    // console.log("🚀 ~ result:", result)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "User profile retrieved successfully"
            )
        );
});
const GetDigitalIDCard = asyncHandler(async (req, res) => {
    const result = await GetDigitalIDCardService(req.user);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200, result, "User digital ID card retrieved successfully"
            )
        );
});
const GetAchievements = asyncHandler(async (req, res) => { });
const GetRankings = asyncHandler(async (req, res) => { });
const ToggleNotifications = asyncHandler(async (req, res) => {
    const result = await ToggleNotificationsService(req.user);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Notifications toggled successfully"
            )
        );
});
const ContactSupport = asyncHandler(async (req, res) => {
    const result = await ContactSupportService(req, res);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Support contacted successfully"
            )
        );
});



export {
    RegisterUser,
    sendEmailOTP,
    verifyEmailOTP,
    sendPhoneOTP,
    verifyPhoneOTP,
    LoginUser,
    VerifyOTP,
    RefreshToken,
    LogoutUser,

    // ============skater =============
    afterLoginSkaterForm,
    GetSkaterProfile,
    GetSkaterDigitalIdCard,
    // =====================
    afterLoginClubForm,
    afterLoginGuestForm,
    afterLoginParentForm,
    afterLoginSchoolForm,
    afterLoginOfficialForm,

    UpdateUserProfile,
    DeleteUser,
    GetUserProfile,
    GetDigitalIDCard,
    GetAchievements,
    GetRankings,
    ToggleNotifications,
    ContactSupport
}