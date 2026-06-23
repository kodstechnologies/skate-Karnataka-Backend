import express from "express";
import {
  getAllAboutUsCards,
  getAboutUsCardById,
  createAboutUsCard,
  updateAboutUsCard,
  deleteAboutUsCard
} from "./aboutUsCard.controller.js";
import {
  getCardMembers,
  getCardMembersAdmin,
  getCardMemberById,
  getCardMemberByIdAdmin,
  createCardMember,
  updateCardMember,
  deleteCardMember
} from "./aboutUsCardMember.controller.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router();

const photoUpload = upload.single("photo");
const s3Upload = uploadToS3("about-us-card", { photo: "photo" });
const memberPhotoUpload = upload.single("photo");
const memberS3Upload = uploadToS3("about-us-card-members", { photo: "photo" });

const authWrite = authenticate(["Skater", "Admin", "State"]);

router.get("/v1/", getAllAboutUsCards);

router.get("/v1/admin/:cardId/members", authWrite, getCardMembersAdmin);
router.get("/v1/admin/:cardId/members/:memberId", authWrite, getCardMemberByIdAdmin);

router.get("/v1/:cardId/members", getCardMembers);
router.get("/v1/:cardId/members/:memberId", getCardMemberById);
router.post("/v1/:cardId/members", authWrite, memberPhotoUpload, memberS3Upload, createCardMember);
router.patch(
  "/v1/:cardId/members/:memberId",
  authWrite,
  memberPhotoUpload,
  memberS3Upload,
  updateCardMember
);
router.delete("/v1/:cardId/members/:memberId", authWrite, deleteCardMember);

router.get("/v1/:id", getAboutUsCardById);
router.post("/v1/", authWrite, photoUpload, s3Upload, createAboutUsCard);
router.patch("/v1/:id", authWrite, photoUpload, s3Upload, updateAboutUsCard);
router.delete("/v1/:id", authWrite, deleteAboutUsCard);

export default router;
