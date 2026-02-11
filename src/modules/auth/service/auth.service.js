import { checkOtp, clearPreviousOtp, generateOtp, isexist, registerUser } from "../repositorie/auth.repositories.js";
import { generateAccessToken, generateRefreshToken } from "../../../util/token/token.js";
import { AppError } from "../../../util/common/AppError.js";

const RegisterUserService = async (userData) => {
    console.log("🚀 ~ RegisterUserService ~ userData:", userData);
    const userExists = await isexist(userData);
    if (userExists) {
        throw new AppError("User already exists", 409);
    }
    await registerUser(userData);
    await generateOtp(userData);
};

const LoginUserService = async (userData) => {
    const userExists = await isexist(userData);
    if (!userExists) {
        throw new AppError("User does not exist", 404);
    }
    await clearPreviousOtp(userData);
    await generateOtp(userData);
};
const VerifyOTPService = async (userData) => {
    console.log("🚀 ~ VerifyOTPService ~ userData:", userData)
    await checkOtp(userData);
    // await clearPreviousOtp(userData);
    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);
    return { accessToken, refreshToken };
};
const RefreshTokenService = async (req, res) => { };
const LogoutUserService = async (req, res) => { };
const UpdateUserProfileService = async (req, res) => { };
const DeleteUserService = async (req, res) => { };
const GetUserProfileService = async (req, res) => { };
const GetDigitalIDCardService = async (req, res) => { };
const GetAchievementsService = async (req, res) => { };
const GetRankingsService = async (req, res) => { };
const ToggleNotificationsService = async (req, res) => { };
const ContactSupportService = async (req, res) => { };

export {
    RegisterUserService,
    LoginUserService,
    VerifyOTPService,
    RefreshTokenService,
    LogoutUserService,
    UpdateUserProfileService,
    DeleteUserService,
    GetUserProfileService,
    GetDigitalIDCardService,
    GetAchievementsService,
    GetRankingsService,
    ToggleNotificationsService,
    ContactSupportService
}