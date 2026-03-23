import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { ContactSupport, DeleteUser, GetAchievements, GetDigitalIDCard, GetRankings, GetUserProfile, LoginUser, LogoutUser, RefreshToken, RegisterUser, sendEmailOTP, sendPhoneOTP, ToggleNotifications, UpdateUserProfile, verifyEmailOTP, VerifyOTP, verifyPhoneOTP } from "./auth.controller.js";
import { LoginValidation, LogoutValidation, RegisterValidation, sendEmailOTPValidation, sendPhoneOTPVelidation, UpdateProfileValidation, verifyEmailOTPVelidation, VerifyOTPValidation, verifyPhoneOTPVelidation } from "./auth.validation.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";


const router = express.Router();

/**
 * @description User registration
 * @route POST /auth/register
 * @access Public
 * @body {
 *   name: string,
 *   dob: string (YYYY-MM-DD),
 *   district: string,
 *   email: string,
 *   phone: string,
 *   role: string
 * }
 */
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
  validateMultiple(verifyEmailOTPVelidation),
  verifyEmailOTP
);

router.post(
  "/v1/send-phone-otp",
  validateMultiple(sendPhoneOTPVelidation),
  sendPhoneOTP
);

router.post(
  "/v1/verify-phone-otp",
  validateMultiple(verifyPhoneOTPVelidation),
  verifyPhoneOTP
);

/**
 * @description User login
 * @route POST /auth/login
 * @access Public
 * @body {
 *   phone: string
 * }
 */
router.post("/v1/login",
    validateMultiple(LoginValidation),
    LoginUser);

/**
 * @description User password verification
 * @route POST /auth/verify-otp
 * @access Public
 * @body {
 *   phone: string,
 *  otp: string
 * }
 */
router.post("/verify-otp",
    validateMultiple(VerifyOTPValidation),
    VerifyOTP);

/**
 * @description Refresh access token
 * @route POST /auth/refresh-token
 * @access Public
 * @body {
 *   refreshToken: string
 * }
 */
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
    validateMultiple(LogoutValidation),
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
router.patch("/update-profile",
    authenticate(["user", "admin"]),
    validateMultiple(UpdateProfileValidation),
    UpdateUserProfile);

/**
 * @description Delete user account
 * @route DELETE /auth/delete
 * @access Private
 */
router.delete("/delete",
    authenticate(["user", "admin"]),
    DeleteUser);

/**
 * @description Get user profile
 * @route GET /auth/profile
 * @access Private
 */
router.get("/profile",
    authenticate(["user", "admin"]),
    GetUserProfile);

/**  
 * @description Get user digital ID card
 * @route GET /auth/digital-id-card
 * @access Private
 */
router.get("/digital-id-card",
    authenticate(["user", "admin"]),
    GetDigitalIDCard);

/**
 * @description Get user achievements
 * @route GET /auth/achievement
 * @access Private
 */
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