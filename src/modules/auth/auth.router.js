import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { ContactSupport, DeleteUser, DisplayChildrenByParent, GetAchievements, GetAllSkatingEventCategoryNames, GetRankings, LoginUser, LogoutUser, RefreshToken, RegisterUser, SelectAccount, sendEmailOTP, sendPhoneOTP, ToggleNotifications, ToggleUserBlock, verifyEmailOTP, VerifyOTP, verifyPhoneOTP } from "./auth.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { restrictUploadedFileFields, uploadAny } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { normalizeSchoolFormPayload } from "../school/schoolFormPayload.js";
import { displayChildrenByParentValidation, LoginValidation, LogoutValidation, RegisterValidation, selectAccountValidation, sendEmailOTPValidation, sendPhoneOTPValidation, toggleUserBlockValidation, verifyEmailOTPValidation, VerifyOTPValidation, verifyPhoneOTPValidation } from "./auth.validation.js";
import { afterLoginSchoolForm } from "../school/school.controller.js";
import { afterLoginSchoolFormValidation } from "../school/school.validation.js";

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

router.get(
    "/v1/login/display-children/:id",
    validate(displayChildrenByParentValidation),
    DisplayChildrenByParent
);
router.post(
    "/v1/login/select-account",
    validate(selectAccountValidation),
    SelectAccount
);

router.post("/verify-otp",
    validate(VerifyOTPValidation),
    VerifyOTP);

router.post("/refresh-token",
    authenticate(["user", "admin"]),
    RefreshToken);

router.post("/logout",
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

router.delete("/delete",
    authenticate(["Skater", "Club", "State", "District", "Admin"]),
    DeleteUser);

router.patch(
    "/v1/toggle-block/:userId",
    authenticate(["Admin", "State", "admin", "state"]),
    validate(toggleUserBlockValidation),
    ToggleUserBlock
);

router.get("/v1/all-skating-event-category", GetAllSkatingEventCategoryNames);

const SCHOOL_FORM_FILE_FIELDS = ["img", "document", "documentFile"];

router.post(
    "/v1/after-login-school-form/:id",
    uploadAny,
    restrictUploadedFileFields(SCHOOL_FORM_FILE_FIELDS),
    uploadToS3("schools", {
        img: "img",
        document: "documents",
        documentFile: "documents",
    }),
    (req, _res, next) => {
        req.body = normalizeSchoolFormPayload(req.body);
        next();
    },
    validate(afterLoginSchoolFormValidation),
    afterLoginSchoolForm
);

export default router;