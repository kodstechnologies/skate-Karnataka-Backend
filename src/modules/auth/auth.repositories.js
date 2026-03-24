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
    const isEmail = await BaseAuth.findOne(email)
    return isEmail;
}

const removeOldEmailOtp = async (email) => {
    await Otp.findOneAndDelete(email);
}

const saveEmailOtp = async (email, otp) => {
    await Otp.create({
        email: email.email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkEmailOTP = async (email) =>{
    const record = await Otp.findOne({email});
    return record;
}

const isExistPhone = async (phone) => {
    const isPhone = await BaseAuth.findOne(phone)
    return isPhone;
}

const removeOldPhoneOtp = async (phone) => {
    await Otp.findOneAndDelete(phone);
}

const savePhoneOTP = async (phone, otp) => {
    await Otp.create({
        phone: phone.phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })
}

const checkPhoneOTP = async (phone) =>{
    const record = await Otp.findOne({phone});
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
    const { userId, otp } = userData;
    let otpDoc;
    if (NODE_ENV === "development" && otp === "123456") {
        otpDoc = await Otp.findOne({
            userId,
            expiresAt: { $gt: new Date() }
        });
    } else {
        otpDoc = await Otp.findOne({
            userId,
            otp,
            expiresAt: { $gt: new Date() }
        });
    }
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
    removeOldEmailOtp,
    removeOldPhoneOtp,
    saveEmailOtp,
    savePhoneOTP,
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