import express from "express";
import {
  getAllOnboarding,
  getOnboardingById,
  createOnboarding,
  updateOnboarding,
  deleteOnboarding,
} from "./onboarding.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router();

const imgFields = upload.fields([
  { name: "imgOne", maxCount: 1 },
  { name: "imgTwo", maxCount: 1 },
  { name: "imgThree", maxCount: 1 },
]);

const s3Upload = uploadToS3("onboarding", {
  imgOne: "imgOne",
  imgTwo: "imgTwo",
  imgThree: "imgThree",
});

router.get("/v1/", getAllOnboarding);
router.get("/v1/:id", getOnboardingById);
router.post("/v1/", imgFields, s3Upload, createOnboarding);
router.patch("/v1/:id", imgFields, s3Upload, updateOnboarding);
router.delete("/v1/:id", deleteOnboarding);

export default router;
