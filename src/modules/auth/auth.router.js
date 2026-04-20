import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { upload } from "../../middleware/multerMiddleware.js";
import { LoginValidation, LogoutValidation, RegisterValidation, sendEmailOTPValidation, sendPhoneOTPValidation, verifyEmailOTPValidation, VerifyOTPValidation, verifyPhoneOTPValidation } from "./auth.validation.js";
import {ContactSupport, GetAchievements, GetDigitalIDCard, GetRankings, LoginUser, LogoutUser, RefreshToken, RegisterUser, sendEmailOTP, sendPhoneOTP, ToggleNotifications, verifyEmailOTP, VerifyOTP, verifyPhoneOTP} from "./auth.controller.js"


const router = express.Router();

router.post("/v1/register",
    validateMultiple(RegisterValidation),
    RegisterUser);

router.post(
    "/v1/send-email-otp",
    validateMultiple(sendEmailOTPValidation),
    sendEmailOTP
);

router.post(
    "/v1/verify-email-otp",
    validateMultiple(verifyEmailOTPValidation),
    verifyEmailOTP
);

router.post(
    "/v1/send-phone-otp",
    validateMultiple(sendPhoneOTPValidation),
    sendPhoneOTP
);

router.post(
    "/v1/verify-phone-otp",
    validateMultiple(verifyPhoneOTPValidation),
    verifyPhoneOTP
);

router.post("/v1/login",
    validateMultiple(LoginValidation),
    LoginUser);

router.post("/verify-otp",
    validateMultiple(VerifyOTPValidation),
    VerifyOTP);

router.post("/refresh-token",
    authenticate([]),
    RefreshToken);

router.post("/logout",
    authenticate([]),
    validateMultiple(LogoutValidation),
    LogoutUser);

router.get("/digital-id-card",
    authenticate([]),
    GetDigitalIDCard);

router.get("/achievement",
    authenticate([]),
    GetAchievements);

router.get("/rankings",
    authenticate([]),
    GetRankings);

router.get("/toggle-notifications",
    authenticate([]),
    ToggleNotifications);

router.get("/support",
    authenticate([]),
    ContactSupport);

export default router;