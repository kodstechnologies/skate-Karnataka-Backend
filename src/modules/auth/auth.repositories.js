import { NODE_ENV } from "../../config/envConfig.js";
import { AppError } from "../../util/common/AppError.js";
import { generateRandomNumber } from "../../util/token/token.js";
import { BaseAuth } from "./baseAuth.model.js";
import { Otp } from "./otp.model.js";

const registerUser = async (userData) => {
    const user = await new BaseAuth(userData).save();
    return user;
};

const isExistEmail = async (email) => {
    console.log(email, "email")
    const isEmail = await BaseAuth.findOne({ email })
    console.log(isEmail, "----")
    return isEmail;
}

const removeOldEmailOtp = async (email) => {
    console.log(email, "uuuu")
    await Otp.findOneAndDelete(email);
    console.log(email, "uuuu")
}

const saveEmailOtp = async (email, otp, id) => {
    await Otp.create({
        userId: id,
        email: email.email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkEmailOTP = async (email) => {
    const record = await Otp.findOne({ email });
    return record;
}

const isExistPhone = async (phone) => {
    console.log(phone, "phone")
    const isPhone = await BaseAuth.findOne({ phone })
    return isPhone;
}
const isExistKSRAId = async (krsaId) => {
    console.log(krsaId, "krsaId")
    const iskrsaId = await BaseAuth.findOne({ krsaId })
    return iskrsaId;
}

const removeOldPhoneOtp = async (phone) => {
    await Otp.findOneAndDelete(phone);
}
const removeOldKRSAIdOtp = async (krsaId) => {
    await Otp.findOneAndDelete(krsaId);
}

const savePhoneOTP = async (phone, otp, id) => {
    await Otp.create({
        userId: id,
        phone: phone.phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const saveKRSAIdOTP = async (krsaId, otp, id) => {
    await Otp.create({
        userId: id,
        krsaId: krsaId.krsaId,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkPhoneOTP = async (phone) => {
    const record = await Otp.findOne({ phone });
    return record;
}

const generateOtp = async (userData) => {
    // 🔢 Generate 6 digit OTP
    const otp = generateRandomNumber(6);
    // Delete old OTP for this user
    await Otp.deleteMany({ userId: userData._id });
    const otpDoc = await new Otp({
        userId: userData._id,   // ✅ changed from identifier
        otp: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }).save();
    return otp; // optional (for SMS sending)
};

const checkOtp = async (userData) => {
    console.log(userData, "data")
    const { userId, otp } = userData;
    let otpDoc;

    otpDoc = await Otp.findOne({
        userId,
        otp,
        expiresAt: { $gt: new Date() }
    });
    console.log(otpDoc, "otpDoc")
    if (!otpDoc) {
        throw new Error("Invalid or expired OTP");
    }
    await Otp.deleteMany({ userId });

    return true;
};

const saveFirebaseToken = async (userData) => {
    const { userId, firebaseToken } = userData;
    if (!firebaseToken) return; // if not provided, skip

    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $addToSet: { firebaseTokens: firebaseToken }
        },
        { new: true }
    );
}

const removeFirebaseTokenAndRefressToken = async (userData) => {
    const { userId, firebaseToken } = userData;
    if (!firebaseToken) return; // if not provided, skip    
    await BaseAuth.findByIdAndUpdate(
        userId,
        {
            $pull: { firebaseTokens: firebaseToken }
        },
        { new: true }
    );
}

const deleteAccount = async (userId) => {
    await BaseAuth.findByIdAndDelete(userId);
}

const getUserProfile = async (userId) => {
    const user = await BaseAuth.findById(userId).select("-firebaseTokens -__v -refreshTokens -createdAt -updatedAt");
    return user;
}

const GetDigitalIDCardDetaisl = async (userData) => {
    const user = await BaseAuth.findById(userData._id).select("fullName phone countryCode photo email district dob");
    return user;
}

const toggleNotification = async (userData) => {
    const user = await BaseAuth.findById(userData._id);
    if (!user) {
        throw new Error("User not found");
    }
    // toggle value
    user.isNotificationsEnabled = !user.isNotificationsEnabled;
    await user.save();
    return user.isNotificationsEnabled;
};

const getSupportContact = async (userData) => {
    return {
        email: "support@krsa.com",
        phone: "+91-9876543210"
    }
}

export {
    registerUser,
    isExistEmail,
    isExistPhone,
    isExistKSRAId,
    removeOldEmailOtp,
    removeOldPhoneOtp,
    removeOldKRSAIdOtp,
    saveEmailOtp,
    savePhoneOTP,
    saveKRSAIdOTP,
    checkEmailOTP,
    checkPhoneOTP,
    generateOtp,
    checkOtp,
    saveFirebaseToken,
    removeFirebaseTokenAndRefressToken,
    deleteAccount,
    getUserProfile,
    GetDigitalIDCardDetaisl,
    toggleNotification,
    getSupportContact,
}