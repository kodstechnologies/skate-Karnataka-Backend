
import { generateAccessToken, generateRandomNumber, generateRefreshToken } from "../../util/token/token.js";
import { AppError } from "../../util/common/AppError.js";
import { sendOTPToEmail } from "../../util/otp/emailOtp.js";
import { sendOTPToPhone } from "../../util/otp/phoneOtp.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import { BaseAuth } from "./baseAuth.model.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { checkEmailOTP, checkOtp, checkPhoneOTP, deleteAccount, isExist, isExistEmail, isExistPhone, registerUser_repositories, removeFirebaseTokenAndRefressToken, removeOldEmailOtp, removeOldPhoneOtp, saveEmailOtp, saveFirebaseToken, savePhoneOTP, saveRefreshToken } from "./auth.repositories.js";

const ROLE_PREFIX_MAP = {
    Skater: "S",
    Parent: "P",
    School: "SC",
    Academy: "A",
    State: "ST",
    Official: "O",
    Admin: "AD",
    Guest: "G",
    Club: "CL",
    District: "D",
    skater: "S",
    parent: "P",
    school: "SC",
    academy: "A",
    state: "ST",
    official: "O",
    admin: "AD",
    guest: "G",
    club: "CL",
    district: "D",
};

const generateKrsaIdCandidate = (role) => {
    const random = Math.floor(100000 + Math.random() * 900000);
    const prefix = ROLE_PREFIX_MAP[role] || "U";
    return `KRSA${random}${prefix}`;
};

const getUniqueKrsaId = async (role) => {
    let attempts = 0;

    while (attempts < 20) {
        const candidate = generateKrsaIdCandidate(role);
        const exists = await BaseAuth.exists({ krsaId: candidate });
        if (!exists) {
            return candidate;
        }
        attempts += 1;
    }

    throw new AppError("Failed to generate KRSA ID", 500);
};

const ensureKrsaIdIfMissing = async (user) => {
    if (user?.krsaId) {
        return user;
    }

    const generatedKrsaId = await getUniqueKrsaId(user?.role);
    await BaseAuth.collection.updateOne(
        { _id: user._id, $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }] },
        { $set: { krsaId: generatedKrsaId } }
    );
    return await BaseAuth.findById(user._id);
};

const RegisterUserService = async (userData) => {
    const selectedClubId = userData.club;
    const normalizedRole = String(userData.role || "").toLowerCase();

    if (["district", "club", "state"].includes(normalizedRole)) {
        userData.verify = true;
    }

    if (normalizedRole === "district") {
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

    if (userData.club) {
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

    if (selectedClubId) {
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
        const userWithKrsaId = await ensureKrsaIdIfMissing(user);
        const accessToken = generateAccessToken(userWithKrsaId);
        const refreshToken = generateRefreshToken(userWithKrsaId);
        await saveRefreshToken(userWithKrsaId._id, refreshToken);

        return {
            id: userWithKrsaId._id,
            // verify: user.verify,
            type: userWithKrsaId.role,
            identifier: identifier,
            krsaId: userWithKrsaId.krsaId,
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
    console.log(userData)
    await removeFirebaseTokenAndRefressToken(userData);
    return true;
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

const DeleteAccountService = async (userData) => {
    await deleteAccount(userData._id);
};

const getAllSkatingEventCategoryNamesService = async () => {
    const categories = await SkatingEventCategory.find({})
        .select("_id typeName")
        .sort({ createdAt: -1 })
        .lean();

    return categories
        .filter(
            (category) =>
                typeof category?.typeName === "string" &&
                category.typeName.trim().length > 0
        )
        .map((category) => ({
            id: category._id,
            name: category.typeName,
        }));
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
    ContactSupportService,
    getAllSkatingEventCategoryNamesService,
    DeleteAccountService,
}