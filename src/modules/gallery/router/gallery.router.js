import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import { displayAllGallery } from "../controller/gallery.controller.js";

const router = express.Router();

router.get("/display", authenticate(["user"]), displayAllGallery);

export default router;
