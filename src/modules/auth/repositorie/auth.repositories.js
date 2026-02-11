import { generateRandomNumber } from "../../../util/token/token.js";
import { BaseAuth } from "../model/baseAuth.model.js";
import { Otp } from "../model/otp.model.js";

const isexist = async (userData) => {
    const existingUser = await BaseAuth.findOne({
        phone: userData.phone
    });
    return !!existingUser;
};

const registerUser = async (userData) => {
    console.log("🚀 ~ registerUser ~ userData:", userData);
    const user = await new BaseAuth(userData).save();
    console.log("🚀 ~ registerUser ~ user:", user);
};

const generateOtp = async (userData) => {
    // 🔢 Generate 6 digit OTP
    const otp = generateRandomNumber(6);
    const otpDoc = await new Otp({
        identifier: userData.phone,
        otp: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
    }).save();
    console.log("🚀 ~ generateOtp ~ otpDoc:", otpDoc);
}

const clearPreviousOtp = async (userData) => {
    await Otp.deleteMany({ identifier: userData.phone });
}

const checkOtp = async (userData) => {
    console.log("🚀 ~ checkOtp ~ userData==:", userData)
    const otpDoc = await Otp.findOne({
        identifier: userData.phone,
        otp: userData.otp,
        expiresAt: { $gt: new Date() }
    })
    console.log("🚀 ~ checkOtp ~ otpDoc:", otpDoc)
    if (!otpDoc) {
        throw new Error("Invalid OTP");
    }
    if (otpDoc.expiresAt < new Date()) {
        throw new Error("OTP expired");
    }
};
export {
    registerUser,
    isexist,
    generateOtp,
    clearPreviousOtp,
    checkOtp,
}