import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import {
  adminForgotPassword,
  adminLogin,
  adminLogout,
  adminResetPassword,
  adminSendOtpForPassword,
  adminVerifyOtpForPassword,
} from "./admin.controller.js";
import {
  adminForgotPasswordValidation,
  adminLoginValidation,
  adminResetPasswordValidation,
  adminSendOtpForPasswordValidation,
  adminVerifyOtpForPasswordValidation,
} from "./admin.validation.js";

const router = express.Router();

router.post("/v1/login", validate(adminLoginValidation), adminLogin);
router.post("/v1/logout", authenticate(["admin"]), adminLogout);
router.post("/v1/forgot-password", validate(adminForgotPasswordValidation), adminForgotPassword);
router.post(
  "/v1/send-otp-for-password",
  validate(adminSendOtpForPasswordValidation),
  adminSendOtpForPassword
);
router.post(
  "/v1/verify-otp-for-password",
  validate(adminVerifyOtpForPasswordValidation),
  adminVerifyOtpForPassword
);
router.post(
  "/v1/reset-password",
  validate(adminResetPasswordValidation),
  adminResetPassword
);


export default router;