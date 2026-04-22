import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addMedia, displayAllMediaBasedOnSkater } from "./gallery.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router()

router.get("/v1/based-on-skater", authenticate(["Skater"]),  displayAllMediaBasedOnSkater);
router.post("/v1", authenticate(["Club", "District", "State"]),upload.single("img"),
    uploadToS3("img"), addMedia);

export default router;