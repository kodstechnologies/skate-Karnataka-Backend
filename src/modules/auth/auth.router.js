import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {ContactSupport, GetAchievements, GetRankings, LoginUser, LogoutUser, RefreshToken, RegisterUser, sendEmailOTP, sendPhoneOTP, ToggleNotifications, verifyEmailOTP, VerifyOTP, verifyPhoneOTP} from "./auth.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { upload } from "../../middleware/multer.middleware.js";
import {LoginValidation, LogoutValidation, RegisterValidation, sendEmailOTPValidation, sendPhoneOTPValidation, verifyEmailOTPValidation, VerifyOTPValidation, verifyPhoneOTPValidation} from "./auth.validation.js";

const router = express.Router();


router.post("/v1/register",
    validate(RegisterValidation),
    RegisterUser);

router.post(
    "/v1/send-email-otp",
    validate(sendEmailOTPValidation),
    sendEmailOTP
);

router.post(
    "/v1/verify-email-otp",
    validate(verifyEmailOTPValidation),
    verifyEmailOTP
);

router.post(
    "/v1/send-phone-otp",
    validate(sendPhoneOTPValidation),
    sendPhoneOTP
);

router.post(
    "/v1/verify-phone-otp",
    validate(verifyPhoneOTPValidation),
    verifyPhoneOTP
);

router.post("/v1/login",
    validate(LoginValidation),
    LoginUser);

router.post("/verify-otp",
    validate(VerifyOTPValidation),
    VerifyOTP);

router.post("/refresh-token",
    authenticate(["user", "admin"]),
    RefreshToken);

router.post("/logout",
    authenticate(["user", "admin"]),
    validate(LogoutValidation),
    LogoutUser);

router.get("/achievement",
    authenticate(["user", "admin"]),
    GetAchievements);

router.get("/rankings",
    authenticate(["user", "admin"]),
    GetRankings);

router.get("/toggle-notifications",
    authenticate(["user", "admin"]),
    ToggleNotifications);

router.get("/support",
    authenticate(["user", "admin"]),
    ContactSupport);

export default router;