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

/**
 * @description User logout
 * @route POST /auth/logout
 * @access Private
 */
router.post("/logout",
    authenticate(["user", "admin"]),
    validate(LogoutValidation),
    LogoutUser);

/**
 * @description Update user profile
 * @route PATCH /auth/update-profile    
 * @access Private
 * @body {
 *   name?: string, 
 *  dob?: string (YYYY-MM-DD),
 *  district?: string,
 *  email?: string,
 *  photo?: string (URL or filename)
 * }
 */
// router.patch("/update-profile",
//     authenticate(["user", "admin"]),
//     validateMultiple(UpdateProfileValidation),
//     UpdateUserProfile);

// /**
//  * @description Delete user account
//  * @route DELETE /auth/delete
//  * @access Private
//  */
// router.delete("/delete",
//     authenticate(["user", "admin"]),
//     DeleteUser);

// /**
//  * @description Get user profile
//  * @route GET /auth/profile
//  * @access Private
//  */
// router.get("/profile",
//     authenticate(["user", "admin"]),
//     GetUserProfile);

// /**  
//  * @description Get user digital ID card
//  * @route GET /auth/digital-id-card
//  * @access Private
//  */
// router.get("/digital-id-card",
//     authenticate(["user", "admin"]),
//     GetDigitalIDCard);

// /**
//  * @description Get user achievements
//  * @route GET /auth/achievement
//  * @access Private
//  */
router.get("/achievement",
    authenticate(["user", "admin"]),
    GetAchievements);

/**
 * @description Get user rankings
 * @route GET /auth/rankings
 * @access Private
 */
router.get("/rankings",
    authenticate(["user", "admin"]),
    GetRankings);

/**
 * @description Toggle user notification preferences
 * @route POST /auth/toggle-notifications
 * @access Private
 */
router.get("/toggle-notifications",
    authenticate(["user", "admin"]),
    ToggleNotifications);

/**
 * @description Contact support
 * @route GET /auth/support
 * @access Private
 */
router.get("/support",
    authenticate(["user", "admin"]),
    ContactSupport);

export default router;