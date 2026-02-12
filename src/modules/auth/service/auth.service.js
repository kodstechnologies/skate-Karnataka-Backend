import { checkOtp, deleteAccount, generateOtp, GetDigitalIDCardDetaisl, getSupportContact, getUserProfile, isexist, registerUser, removeFirebaseTokenAndRefressToken, saveFirebaseToken, toggleNotification } from "../repositorie/auth.repositories.js";
import { generateAccessToken, generateRefreshToken } from "../../../util/token/token.js";
import { AppError } from "../../../util/common/AppError.js";

const RegisterUserService = async (userData) => {
    const userExists = await isexist(userData);
    if (userExists) {
        throw new AppError("User already exists", 409);
    }
    const user = await registerUser(userData);
    await generateOtp(user);
    return user._id;
};

const LoginUserService = async (userData) => {
    const userExists = await isexist(userData);
    console.log("🚀 ~ LoginUserService ~ userExists:", userExists)
    if (!userExists) {
        throw new AppError("User does not exist", 404);
    }
    await generateOtp(userExists);
    return userExists._id;
};
const VerifyOTPService = async (userData) => {
    console.log("🚀 ~ VerifyOTPService ~ userData:", userData)
    await checkOtp(userData);
    await saveFirebaseToken(userData);
    const accessToken = generateAccessToken(userData);
    const refreshToken = generateRefreshToken(userData);
    return { userId: userData.userId, accessToken, refreshToken };
};
const RefreshTokenService = async (req, res) => { };
const LogoutUserService = async (userData) => {
    console.log("🚀 ~ LogoutUserService ~ userData:", userData)
    await removeFirebaseTokenAndRefressToken({ ...userData, firebaseToken: null });
};
const UpdateUserProfileService = async (req, res) => { };
const DeleteUserService = async (userData) => {
    console.log("🚀 ~ DeleteUserService ~ userData:", userData._id)
    await deleteAccount(userData._id);
};
const GetUserProfileService = async (userData) => {
    const profile = await getUserProfile(userData._id);
    console.log("🚀 ~ GetUserProfileService ~ profile:", profile)
    return profile;
};
const GetDigitalIDCardService = async (userData) => {
    const digitalIDCard = await GetDigitalIDCardDetaisl(userData);
    return digitalIDCard;
};
const GetAchievementsService = async (req, res) => { };
const GetRankingsService = async (req, res) => { };
const ToggleNotificationsService = async (userData) => {
    return await toggleNotification(userData);
};
const ContactSupportService = async (userData) => {
    return await getSupportContact(userData);
};

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