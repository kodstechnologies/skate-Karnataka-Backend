import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { afterLoginFormSkaterService, ContactSupportService, DeleteUserService, GetDigitalIDCardService, GetUserProfileService, LoginUserService, LogoutUserService, RegisterUserService, sendEmailOTPService, sendPhoneOTPService, ToggleNotificationsService, UpdateUserProfileService, verifyEmailOTPService, VerifyOTPService, verifyPhoneOTPService } from "./auth.service.js";

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

const afterLoginSkaterform = asyncHandler(async (req, res) => {
    await afterLoginFormSkaterService(req.body);
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            null,
            "Form Submioted sucessafully"
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
    afterLoginSkaterform,
    UpdateUserProfile,
    DeleteUser,
    GetUserProfile,
    GetDigitalIDCard,
    GetAchievements,
    GetRankings,
    ToggleNotifications,
    ContactSupport
}