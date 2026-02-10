import { asyncHandler } from "../../../util/common/asyncHandler.js";

const RegisterUser = asyncHandler(async (req, res) => { });
const LoginUser = asyncHandler(async (req, res) => { });
const VerifyPassword = asyncHandler(async (req, res) => { });
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
    VerifyPassword,
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