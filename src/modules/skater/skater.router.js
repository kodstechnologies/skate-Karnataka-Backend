import express from "express";
import { afterLoginSkaterForm, DeleteSkater, GetSkaterDigitalIdCard, GetSkaterProfile, UpdateSkaterProfile } from "./skater.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginSkaterFormValidation, UpdateProfileValidation } from "./skater.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router();


router.post(
  "/v1/after-login-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 10 }
  ]),
  uploadToS3("skaters", { img: "photo", document: "documents" }),
  validate(afterLoginSkaterFormValidation),
  afterLoginSkaterForm
);

// profile ===

router.get("/v1/profile",
    authenticate(["Skater"]),
    GetSkaterProfile);

// edit profile ==

router.patch("/v1/update-profile",
    authenticate([]),
    validate(UpdateProfileValidation),
    UpdateSkaterProfile);

// delete profile ==

router.delete("/v1/delete",
    authenticate([]),
    DeleteSkater);


// digital id card 

router.get("/v1/digital-id-card",
    authenticate(["Skater"]),
    GetSkaterDigitalIdCard);


export default router;