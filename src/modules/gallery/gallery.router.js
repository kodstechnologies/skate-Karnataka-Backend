import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addMedia, displayAllMedia, displayAllMediaBasedOnSkater } from "./gallery.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router()

router.get("/v1/based-on-skater", authenticate(["Skater"]),  displayAllMediaBasedOnSkater);
router.get("/v1/all", authenticate(["Admin"]),  displayAllMedia);
router.post("/v1", authenticate(["Admin","Club", "District", "State"]),
    upload.fields([
      { name: "img", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    uploadToS3("img", { img: "img", video: "videoUrl" }), addMedia);


export default router;