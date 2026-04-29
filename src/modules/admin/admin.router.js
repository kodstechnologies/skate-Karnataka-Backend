import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import {
  adminForgotPassword,
  adminProfile,
  editAdminProfile,
  adminLogin,
  adminLogout,
  adminResetPassword,
  adminSendOtpForPassword,
  adminVerifyOtpForPassword,
  createDistrictByAdmin,
  deleteDistrictByAdmin,
  getAllDistrictsByAdmin,
  updateDistrictByAdmin,
} from "./admin.controller.js";
import {
  adminForgotPasswordValidation,
  adminEditProfileValidation,
  adminLoginValidation,
  adminResetPasswordValidation,
  adminSendOtpForPasswordValidation,
  adminVerifyOtpForPasswordValidation,
  createDistrictByAdminValidation,
  districtByAdminIdValidation,
  updateDistrictByAdminValidation,
} from "./admin.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router();

router.get("/v1/profile", authenticate(["admin"]), adminProfile);
router.patch("/v1/edit-profile", authenticate(["admin"]), upload.single("img"),
  uploadToS3("img"), validate(adminEditProfileValidation), editAdminProfile);

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

// district ===================================

router.get("/v1/district", authenticate(["State", "admin"]), getAllDistrictsByAdmin);
router.post(
  "/v1/district",
  authenticate(["State", "admin"]),
  validate(createDistrictByAdminValidation),
  createDistrictByAdmin
);
router.patch(
  "/v1/district/:id",
  authenticate(["State", "admin"]),
  validate(updateDistrictByAdminValidation),
  updateDistrictByAdmin
);
router.delete(
  "/v1/district/:id",
  authenticate(["State", "admin"]),
  validate(districtByAdminIdValidation),
  deleteDistrictByAdmin
);



export default router;