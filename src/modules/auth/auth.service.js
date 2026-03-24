import { isExistEmail, checkOtp, deleteAccount, generateOtp, GetDigitalIDCardDetaisl, getSupportContact, getUserProfile, registerUser, removeFirebaseTokenAndRefressToken, saveFirebaseToken, toggleNotification, isExistPhone, removeOldEmailOtp, removeOldPhoneOtp, saveEmailOtp, savePhoneOTP, checkEmailOTP, checkPhoneOTP } from "./auth.repositories.js";
import { generateAccessToken, generateRandomNumber, generateRefreshToken } from "../../util/token/token.js";
import { AppError } from "../../util/common/AppError.js";
import { sendOTPToEmail } from "../../util/otp/emailOtp.js";
import { sendOTPToPhone } from "../../util/otp/phoneOtp.js";

const RegisterUserService = async (userData) => {
    const isEmail = await isExistEmail(userData);
    const idPhone = await isExistPhone(userData);

    if (isEmail || idPhone) {
        throw new AppError("User already exists", 409);
    }
    const user = await registerUser(userData);
    await generateOtp(user);
    return user._id;
};

const sendEmailOTPService = async (email) => {
    // check email priviously exist or not  
    const ExistEmail = await isExistEmail(email);
    if (ExistEmail) {
        throw new AppError("Email already exist", 409);
    }

    //remove old otp
    await removeOldEmailOtp(email);
    // save in db 
    const otp = generateRandomNumber();
    await saveEmailOtp(email, otp);
    // send otp 
    await sendOTPToEmail(email);
}

const verifyEmailOTPService = async (data) => {
    const { email, otp } = data;
    const record = await checkEmailOTP(email);
    if (record.otp !== otp) {
        throw new AppError("Invalid OTP", 400);
    }

    if (record.expiresAt < new Date()) {
        throw new AppError("OTP has expired", 400);
    }

    return true;
};
const sendPhoneOTPService = async (phone) => {
    // check email priviously exist or not  
    const ExistPhone = await isExistPhone(phone);
    if (ExistPhone) {
        throw new AppError("Phone already exist", 409);
    }
    //remove old otp
    await removeOldPhoneOtp(phone);
    // save in db 
    const otp = generateRandomNumber();
    await savePhoneOTP(phone, otp);
    // send otp 
    await sendOTPToPhone(phone);
}

const verifyPhoneOTPService = async (data) => {
    const {phone , otp} = data;

    const record = await checkPhoneOTP(phone);
    if(record.otp !== otp){
        throw new AppError("Invalid OTP" ,400);
    }
    if(record.expiresAt < new Date()){
        throw new AppError("OTP has expired", 400);
    }

    return true;
}

const LoginUserService = async (userData) => {
    const userExists = await isexistEmail(userData);
    console.log("🚀 ~ LoginUserService ~ userExists:", userExists)
    if (!userExists) {
        throw new AppError("User does not exist", 404);
    }
    await generateOtp(userExists);
    return userExists._id;
};
const VerifyOTPService = async (userData) => {
    // console.log("🚀 ~ VerifyOTPService ~ userData:", userData)
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
const UpdateUserProfileService = async (userData, updateData) => {
};
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
    sendEmailOTPService,
    verifyEmailOTPService,
    sendPhoneOTPService,
    verifyPhoneOTPService,
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