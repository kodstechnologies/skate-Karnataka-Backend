
import { generateAccessToken, generateRandomNumber, generateRefreshToken } from "../../util/token/token.js";
import { AppError } from "../../util/common/AppError.js";
import { sendOTPToEmail } from "../../util/otp/emailOtp.js";
import { sendRegistrationWelcomeEmail } from "../../util/email/registrationEmail.js";
import { sendOTPToPhone } from "../../util/otp/phoneOtp.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import { BaseAuth } from "./baseAuth.model.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { legacyStandardCategoryClause } from "../event/skatingEventCategory.policy.js";
import mongoose from "mongoose";
import { checkEmailOTP, checkOtp, checkPhoneOTP, deleteAccount, findParentByIdForChildren, findSkatersByParentPhone, isExist, isExistEmail, isExistKSRAId, isExistPhone, registerUser_repositories, removeFirebaseTokenAndRefressToken, removeOldEmailOtp, removeOldKRSAIdOtp, removeOldPhoneOtp, saveEmailOtp, saveFirebaseToken, saveKRSAIdOTP, savePhoneOTP, saveRefreshToken } from "./auth.repositories.js";
import { assertMemberApprovedCanLogin, resolveVerifyOnRegister } from "./authLoginPolicy.js";

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
    const normalizedRole = String(userData.role || "").trim().toLowerCase();

    userData.verify = resolveVerifyOnRegister(normalizedRole);

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
    if (isEmail !== null) {
        throw new AppError("Email already exists", 409);
    }
    if (idPhone !== null) {
        const existingRole = String(idPhone.role || "user").trim();
        throw new AppError(
            `Phone number already exists${existingRole ? ` for ${existingRole} account` : ""}`,
            409
        );
    }
    delete userData.districtName;
    if (normalizedRole === "skater") {
        userData.role = "Skater";
    }
    if (normalizedRole === "school") {
        userData.role = "School";
    }
    if (normalizedRole === "academy" || normalizedRole === "club") {
        userData.role = "Academy";
    }
    if (normalizedRole === "official" || normalizedRole === "officials") {
        userData.role = "Official";
    }
    if (normalizedRole === "guest") {
        userData.role = "Guest";
    }
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

    const registeredUser = await BaseAuth.findById(user._id)
        .populate("district", "name")
        .populate("club", "name")
        .lean();

    if (registeredUser?.email) {
        sendRegistrationWelcomeEmail(registeredUser).catch((err) => {
            console.error("Registration welcome email failed:", err?.message || err);
        });
    }

    return {
        userId: registeredUser._id,
        krsaId: registeredUser.krsaId || "",
        email: registeredUser.email || "",
        fullName: registeredUser.fullName || "",
        role: registeredUser.role || "",
        phone: registeredUser.phone || "",
        verify: Boolean(registeredUser.verify),
    };
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
    await saveEmailOtp(email, otp);
    // send otp 
    await sendOTPToEmail(email.email, otp);
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
    await sendOTPToPhone(phone.phone, otp);
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

const BLOCKED_ACCOUNT_MESSAGE =
    "Your account has been blocked by the KRSA administrator. Please contact support if you believe this is a mistake.";

const assertUserNotBlocked = (user) => {
    if (user?.isBlocked) {
        throw new AppError(BLOCKED_ACCOUNT_MESSAGE, 401);
    }
};

const normalizeKrsaId = (value) => String(value).trim().toUpperCase();

const LoginUserService = async (identifier) => {
    const normalizedIdentifier = String(identifier).trim();
    const otp = generateRandomNumber();
    const createLoginResult = async (user) => {
        assertUserNotBlocked(user);
        await assertMemberApprovedCanLogin(user);
        const userWithKrsaId = await ensureKrsaIdIfMissing(user);
        const accessToken = generateAccessToken(userWithKrsaId);
        const refreshToken = generateRefreshToken(userWithKrsaId);
        await saveRefreshToken(userWithKrsaId._id, refreshToken);

        return {
            id: userWithKrsaId._id,
            // verify: user.verify,
            type: userWithKrsaId.role,
            identifier: normalizedIdentifier,
            krsaId: userWithKrsaId.krsaId,
            // accessToken,
            // refreshToken,
        };
    };

    // console.log(identifier, "identifier");

    // Email
    if (normalizedIdentifier.includes("@")) {
        const user = await isExistEmail(normalizedIdentifier);
        if (!user) {
            throw new AppError("Email not registered", 404);
        }

        await removeOldEmailOtp(normalizedIdentifier);
        await saveEmailOtp(normalizedIdentifier, otp, user._id);
        await sendOTPToEmail(normalizedIdentifier, otp);
        return await createLoginResult(user);
    }

    // Phone
    else if (/^[6-9]\d{9}$/.test(normalizedIdentifier)) {
        const user = await isExistPhone(normalizedIdentifier);
        if (!user) {
            throw new AppError("Phone number not registered", 404);
        }

        await removeOldPhoneOtp(normalizedIdentifier);
        await savePhoneOTP(normalizedIdentifier, otp, user._id);

        // No SMS provider is configured yet, so deliver the OTP to the
        // user's registered email when available, with an SMS fallback.
        if (user.email) {
            await sendOTPToEmail(user.email, otp);
        } else {
            await sendOTPToPhone(normalizedIdentifier, otp);
        }
        return await createLoginResult(user);
    }

    // KRSA ID — any non-email, non-phone identifier is treated as a KRSA ID
    // and resolved against the DB, so the exact ID format does not matter.
    else {
        const krsaId = normalizeKrsaId(normalizedIdentifier);
        const user = await isExistKSRAId(krsaId);
        if (!user) {
            throw new AppError("KRSA ID not found", 404);
        }
        await removeOldKRSAIdOtp(krsaId);
        await saveKRSAIdOTP(krsaId, otp, user._id);

        // KRSA ID has no channel of its own, so deliver to the user's
        // registered email, falling back to their phone.
        if (user.email) {
            await sendOTPToEmail(user.email, otp);
        } else if (user.phone) {
            await sendOTPToPhone(user.phone, otp);
        } else {
            throw new AppError("No email or phone on file to send OTP", 400);
        }
        return await createLoginResult(user);
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
    assertUserNotBlocked(user);
    await assertMemberApprovedCanLogin(user);

    // console.log(user, "user")
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user._id, refreshToken);

    return { userId: userData.userId, verify: user.verify, role: user.role, krsaId: user.krsaId, accessToken, refreshToken };
};

const SelectAccountLoginService = async (userData) => {
    const { userId } = userData;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user id", 400);
    }

    const user = await isExist({ userId });
    if (!user) {
        throw new AppError("User not found", 404);
    }
    assertUserNotBlocked(user);
    await assertMemberApprovedCanLogin(user);

    if (user?.email) {
        const existingEmailUser = await isExistEmail(user.email);
        if (existingEmailUser && String(existingEmailUser._id) !== String(user._id)) {
            throw new AppError("Email already exists", 409);
        }
    }

    await saveFirebaseToken(userData);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user._id, refreshToken);

    return {
        userId: user._id,
        verify: user.verify,
        role: user.role,
        krsaId: user.krsaId || "",
        accessToken,
        refreshToken,
    };
};






const RefreshTokenService = async (req, res) => { };
const LogoutUserService = async (userData) => {
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

const ToggleUserBlockService = async (userId, isBlocked) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user id", 400);
    }

    const allowedRoles = ["Skater", "District", "Club"];
    const user = await BaseAuth.findOne({ _id: userId, role: { $in: allowedRoles } });
    if (!user) {
        throw new AppError("User not found", 404);
    }

    user.isBlocked = Boolean(isBlocked);

    if (user.isBlocked) {
        user.refreshTokens = [];
        user.firebaseTokens = [];
    }

    await user.save();

    return {
        userId: String(user._id),
        fullName: user.fullName || "",
        krsaId: user.krsaId || "",
        role: user.role || "",
        isBlocked: user.isBlocked,
    };
};

const displayChildrenByParentService = async (parentId) => {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
        throw new AppError("Invalid parent id", 400);
    }

    const parent = await findParentByIdForChildren(parentId);
    if (!parent) {
        throw new AppError("Parent not found", 404);
    }

    const children = await findSkatersByParentPhone({
        parentId,
        parentPhone: parent.phone,
    });
    const createdSkaters = children.map((skater) => ({
        skaterId: skater._id,
        skaterName: skater.fullName || "",
        phone: skater.phone || "",
        krsaId: skater.krsaId || "",
        photo: skater.photo || skater.profile || "",
        verify: Boolean(skater.verify),
    }));

    return {
        parentId: String(parent._id),
        parentName: parent.fullName || "",
        parentAccount: {
            userId: String(parent._id),
            fullName: parent.fullName || "",
            role: String(parent.role || "Parent").toLowerCase(),
        },
        matchedBy: {
            skaterParentId: true,
            parentPhone: parent.phone || "",
        },
        createdSkaters,
    };
};

const getAllSkatingEventCategoryNamesService = async () => {
    const categories = await SkatingEventCategory.find(legacyStandardCategoryClause())
        .select("_id typeName categoryStatus")
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
    SelectAccountLoginService,

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
    displayChildrenByParentService,
    ToggleUserBlockService,
}