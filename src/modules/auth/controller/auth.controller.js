import { asyncHandler } from "../../../util/common/asyncHandler.js";
import { LoginUserService, RegisterUserService, VerifyOTPService } from "../service/auth.service.js";

const RegisterUser = asyncHandler(async (req, res) => {
    await RegisterUserService(req.body);
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: null // result.user // Don't return user data for security reasons
    });
});

const LoginUser = asyncHandler(async (req, res) => {
    await LoginUserService(req.body);
    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user: null // result.user // Don't return user data for security reasons
    });
});

const VerifyOTP = asyncHandler(async (req, res) => {
    console.log("🚀 ~ req:", req.body)
    const result = await VerifyOTPService(req.body);
    res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
    });
});
const RefreshToken = asyncHandler(async (req, res) => { });
const LogoutUser = asyncHandler(async (req, res) => { });
const UpdateUserProfile = asyncHandler(async (req, res) => { });
const DeleteUser = asyncHandler(async (req, res) => { });
const GetUserProfile = asyncHandler(async (req, res) => { });
const GetDigitalIDCard = asyncHandler(async (req, res) => { });
const GetAchievements = asyncHandler(async (req, res) => { });
const GetRankings = asyncHandler(async (req, res) => { });
const ToggleNotifications = asyncHandler(async (req, res) => { });
const ContactSupport = asyncHandler(async (req, res) => { });

export {
    RegisterUser,
    LoginUser,
    VerifyOTP,
    RefreshToken,
    LogoutUser,
    UpdateUserProfile,
    DeleteUser,
    GetUserProfile,
    GetDigitalIDCard,
    GetAchievements,
    GetRankings,
    ToggleNotifications,
    ContactSupport
}