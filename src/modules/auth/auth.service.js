import { isExistEmail, checkOtp, deleteAccount, generateOtp, GetDigitalIDCardDetaisl, getSupportContact, getUserProfile, registerUser, removeFirebaseTokenAndRefressToken, saveFirebaseToken, toggleNotification, removeOldEmailOtp, removeOldPhoneOtp, saveEmailOtp, savePhoneOTP, checkEmailOTP, checkPhoneOTP, isExistPhone, removeOldKRSAIdOtp, saveKRSAIdOTP, isExistKSRAId, isExist, afterLoginSkaterFormRepositories, afterLoginClubFormRepositories, afterLoginGuestFormRepositories, afterLoginParentFormRepositories, afterLoginSchoolFormRepositories, afterLoginOfficialFormRepositories, get_skater_profile_repositories } from "./auth.repositories.js";
import { generateAccessToken, generateRandomNumber, generateRefreshToken } from "../../util/token/token.js";
import { AppError } from "../../util/common/AppError.js";
import { sendOTPToEmail } from "../../util/otp/emailOtp.js";
import { sendOTPToPhone } from "../../util/otp/phoneOtp.js";

const RegisterUserService = async (userData) => {
    const { email, phone } = userData;
    const isEmail = await isExistEmail(email);
    const idPhone = await isExistPhone(phone);
    if ((isEmail !== null) || (idPhone !== null)) {
        throw new AppError("User already exists", 409);
    }
    const user = await registerUser(userData);
    return user._id;
};

const sendEmailOTPService = async (email) => {
    // check email priviously exist or not  
    const ExistEmail = await isExistEmail(email.email);
    console.log(ExistEmail, "ExistEmail")
    if (ExistEmail) {
        throw new AppError("Email already exist", 409);
    }

    //remove old otp
    await removeOldEmailOtp(email);
    // save in db 
    const otp = generateRandomNumber();
    console.log(otp, "otpotp")
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
    const ExistPhone = await isExistPhone(phone.phone);
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
    const { phone, otp } = data;

    const record = await checkPhoneOTP(phone);
    if (record.otp !== otp) {
        throw new AppError("Invalid OTP", 400);
    }
    if (record.expiresAt < new Date()) {
        throw new AppError("OTP has expired", 400);
    }

    return true;
}


const LoginUserService = async (identifier) => {
    const otp = generateRandomNumber();

    // console.log(identifier, "identifier");

    // Email
    if (identifier.includes("@")) {
        const user = await isExistEmail(identifier);
        const id = user._id;
        if (!user) {
            throw new AppError("Email not registered", 404);
        }

        await removeOldEmailOtp(identifier);
        await saveEmailOtp(identifier, otp, id);

        return { type: "email", identifier, id };
    }

    // Phone
    else if (/^[6-9]\d{9}$/.test(identifier)) {
        console.log(identifier, "identifier")
        const user = await isExistPhone(identifier);
        const id = user._id;
        // console.log(user, "----", id)
        if (!user) {
            throw new AppError("Phone number not registered", 404);
        }

        await removeOldPhoneOtp(identifier);
        await savePhoneOTP(identifier, otp, id);

        return { type: "phone", identifier, id };
    }

    // KRSA ID  (NEW)
    else if (/^KRSA\d{6}[A-Z]+$/.test(identifier)) {
        const user = await isExistKSRAId(identifier);
        const id = user._id;
        if (!user) {
            throw new AppError("KRSA ID not found", 404);
        }
        await removeOldKRSAIdOtp(identifier);
        await saveKRSAIdOTP(identifier, otp, id);

        return { type: "krsaId", identifier, id };
    }

    // Invalid
    else {
        throw new AppError("Invalid identifier format", 400);
    }
};
const VerifyOTPService = async (userData) => {
    // console.log("🚀 ~ VerifyOTPService ~ userData:", userData)
    await checkOtp(userData);
    await saveFirebaseToken(userData);

    const user = await isExist(userData);
    if (!user) {
        throw new AppError("User not found after OTP verification", 404);
    }
    
    // console.log(user, "user")
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return { userId: userData.userId, verify: user.verify, role: user.role, krsaId: user.krsaId, accessToken, refreshToken };
};
// ======================================
const afterLoginFormSkaterService = async (data, id) => {
    await afterLoginSkaterFormRepositories(data, id);
}

const get_skater_profile_service = async(id) =>{
    return await get_skater_profile_repositories(id);
}
// ==============================================
const afterLoginFormClubService = async (data, id) => {
    // console.log(data, "---")
    await afterLoginClubFormRepositories(data, id);
}

const afterLoginFormGuestService = async (data, id) => {
    await afterLoginGuestFormRepositories(data, id);
}

const afterLoginFormParentService = async (data, id) => {
    await afterLoginParentFormRepositories(data, id);

}

const afterLoginFormSchoolService = async (data, id) => {
    await afterLoginSchoolFormRepositories(data, id);

}

const afterLoginFormOfficialService = async (data, id) => {
     await afterLoginOfficialFormRepositories(data, id); 
}

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
    // =====================================
    afterLoginFormSkaterService,
    get_skater_profile_service,
    // ========================================
    afterLoginFormClubService,
    afterLoginFormGuestService,
    afterLoginFormParentService,
    afterLoginFormSchoolService,
    afterLoginFormOfficialService,
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