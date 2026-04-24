
import { generateAccessToken, generateRandomNumber, generateRefreshToken } from "../../util/token/token.js";
import { AppError } from "../../util/common/AppError.js";
import { sendOTPToEmail } from "../../util/otp/emailOtp.js";
import { sendOTPToPhone } from "../../util/otp/phoneOtp.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import {checkEmailOTP, checkOtp, checkPhoneOTP, isExist, isExistEmail, isExistPhone, registerUser_repositories, removeOldEmailOtp, removeOldPhoneOtp, saveEmailOtp, saveFirebaseToken, savePhoneOTP, saveRefreshToken} from "./auth.repositories.js";

const RegisterUserService = async (userData) => {
    const selectedClubId = userData.club;

    if (String(userData.role || "").toLowerCase() === "district") {
        const districtName = String(userData.districtName || "").trim();

        if (!userData.district && districtName) {
            const existingDistrict = await District.findOne({ name: districtName }).select("_id").lean();

            if (existingDistrict) {
                userData.district = existingDistrict._id;
            } else {
                const newDistrict = await District.create({ name: districtName });
                userData.district = newDistrict._id;
            }
        } else if (userData.district) {
            const districtExists = await District.findById(userData.district).select("_id").lean();
            if (!districtExists) {
                throw new AppError("District not found", 404);
            }
        }
    }

    if (String(userData.role || "").toLowerCase() === "club" && userData.club) {
        const clubExists = await Club.findById(userData.club).select("_id").lean();
        if (!clubExists) {
            throw new AppError("Club not found", 404);
        }
    }

    const { email, phone } = userData;
    const isEmail = await isExistEmail(email);
    const idPhone = await isExistPhone(phone);
    if ((isEmail !== null) || (idPhone !== null)) {
        throw new AppError("User already exists", 409);
    }
    delete userData.districtName;
    const user = await registerUser_repositories(userData);

    if (String(user.role || "").toLowerCase() === "district" && user.district) {
        await District.findByIdAndUpdate(
            user.district,
            { $addToSet: { members: user._id } },
            { new: false }
        );
    }

    if (String(user.role || "").toLowerCase() === "club" && selectedClubId) {
        await Club.findByIdAndUpdate(
            selectedClubId,
            { $addToSet: { members: user._id } },
            { new: false }
        );
    }

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
    const createLoginResult = async (user) => {
        console.log(user,"====")
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await saveRefreshToken(user._id, refreshToken);

        return {
            id: user._id,
            // verify: user.verify,
            type: user.role,
            identifier: identifier,
            // accessToken,
            // refreshToken,
        };
    };

    // console.log(identifier, "identifier");

    // Email
    if (identifier.includes("@")) {
        const user = await isExistEmail(identifier);
        if (!user) {
            throw new AppError("Email not registered", 404);
        }

        await removeOldEmailOtp(identifier);
        await saveEmailOtp(identifier, otp, user._id);
        return await createLoginResult(user);
    }

    // Phone
    else if (/^[6-9]\d{9}$/.test(identifier)) {
        console.log(identifier, "identifier")
        const user = await isExistPhone(identifier);
        if (!user) {
            throw new AppError("Phone number not registered", 404);
        }

        await removeOldPhoneOtp(identifier);
        await savePhoneOTP(identifier, otp, user._id);
        return await createLoginResult(user);
    }

    // KRSA ID  (NEW)
    else if (/^KRSA\d{6}[A-Z]+$/.test(identifier)) {
        const user = await isExistKSRAId(identifier);
        if (!user) {
            throw new AppError("KRSA ID not found", 404);
        }
        await removeOldKRSAIdOtp(identifier);
        await saveKRSAIdOTP(identifier, otp, user._id);
        return await createLoginResult(user);
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
    await saveRefreshToken(user._id, refreshToken);

    return { userId: userData.userId, verify: user.verify, role: user.role, krsaId: user.krsaId, accessToken, refreshToken };
};






const RefreshTokenService = async (req, res) => { };
const LogoutUserService = async (userData) => {
    console.log("🚀 ~ LogoutUserService ~ userData:", userData)
    await removeFirebaseTokenAndRefressToken({ ...userData, firebaseToken: null });
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

    // afterLoginFormClubService,
    // afterLoginFormGuestService,
    // afterLoginFormParentService,
    // afterLoginFormSchoolService,
    // afterLoginFormOfficialService,
    RefreshTokenService,
    LogoutUserService,
 
    GetUserProfileService,
    GetDigitalIDCardService,
    GetAchievementsService,
    GetRankingsService,
    ToggleNotificationsService,
    ContactSupportService
}