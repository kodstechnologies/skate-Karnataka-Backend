import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  addMedia,
  approveMediaByAdmin,
  approveMediaDeleteByAdmin,
  basedOnRoleDisplay,
  deleteMedia,
  displayAllMedia,
  displayAllMediaBasedOnSkater,
  displayPendingMediaForAdmin,
  rejectMediaByAdmin,
  rejectMediaDeleteByAdmin,
  updateMedia,
} from "./gallery.controller.js";
import { uploadGallery } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router()

// skater ============================
router.get("/v1/based-on-skater", authenticate(["Skater"]),  displayAllMediaBasedOnSkater);

// =====================
router.get("/v1/all", authenticate(["Admin","State"]),  displayAllMedia);
router.get(
  "/v1/admin/pending",
  authenticate(["Admin", "State"]),
  displayPendingMediaForAdmin
);
router.get("/v1", authenticate(["Admin","Club", "District", "State"]),basedOnRoleDisplay)
router.post("/v1", authenticate(["Admin","Club", "District", "State"]),
    uploadGallery.fields([
      { name: "img", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    uploadToS3("gallery", { img: "imageUrl", video: "videoUrl" }), addMedia);

router.patch("/v1/:id", authenticate(["Admin","Club", "District", "State"]),
    uploadGallery.fields([
      { name: "img", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    uploadToS3("gallery", { img: "imageUrl", video: "videoUrl" }), updateMedia);
router.delete("/v1/:id", authenticate(["Admin","Club", "District", "State"]), deleteMedia);

router.patch(
  "/v1/admin/media/:id/approve",
  authenticate(["Admin", "State"]),
  approveMediaByAdmin
);
router.patch(
  "/v1/admin/media/:id/reject",
  authenticate(["Admin", "State"]),
  rejectMediaByAdmin
);
router.patch(
  "/v1/admin/media/:id/approve-delete",
  authenticate(["Admin", "State"]),
  approveMediaDeleteByAdmin
);
router.patch(
  "/v1/admin/media/:id/reject-delete",
  authenticate(["Admin", "State"]),
  rejectMediaDeleteByAdmin
);

export default router;
