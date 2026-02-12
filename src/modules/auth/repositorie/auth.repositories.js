import { NODE_ENV } from "../../../config/envConfig.js";
import { generateRandomNumber } from "../../../util/token/token.js";
import { BaseAuth } from "../model/baseAuth.model.js";
import { Otp } from "../model/otp.model.js";

const isexist = async (userData) => {
    const existingUser = await BaseAuth.findOne({
        phone: userData.phone
    });
    return existingUser;
};

const registerUser = async (userData) => {
    // console.log("🚀 ~ registerUser ~ userData:", userData);
    const user = await new BaseAuth(userData).save();
    // console.log("🚀 ~ registerUser ~ user:", user);
    return user;
};

const generateOtp = async (userData) => {
    console.log("🚀 ~ generateOtp ~ userData:", userData);
    // 🔢 Generate 6 digit OTP
    const otp = generateRandomNumber(6);
    // Delete old OTP for this user
    await Otp.deleteMany({ userId: userData._id });
    const otpDoc = await new Otp({
        userId: userData._id,   // ✅ changed from identifier
        otp: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }).save();
    console.log("🚀 ~ generateOtp ~ otpDoc:", otpDoc);

    return otp; // optional (for SMS sending)
};

const checkOtp = async (userData) => {
    console.log("🚀 ~ checkOtp ~ userData==:", userData)
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

    // Delete OTP after successful verification
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
    console.log("🚀 ~ removeFirebaseTokenAndRefressToken ~ userData:", userData)
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
    console.log("🚀 ~ deleteAccount ~ userId:", userId)
    await BaseAuth.findByIdAndDelete(userId);
}

const getUserProfile = async (userId) => {
    // console.log("🚀 ~ getUserProfile ~ userId:", userId)
    const user = await BaseAuth.findById(userId).select("-firebaseTokens -__v -refreshTokens -createdAt -updatedAt");
    return user;
}

const GetDigitalIDCardDetaisl = async (userData) => {
    console.log("🚀 ~ GetDigitalIDCardDetaisl ~ userData:", userData)
    const user = await BaseAuth.findById(userData._id).select("fullName phone countryCode photo email district dob");
    return user;
}

const toggleNotification = async (userData) => {
    console.log("🚀 userData:", userData);

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
    isexist,
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