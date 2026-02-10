import express from "express";
import { authenticate } from "../../../middleware/authMiddleware";

const router = express.Router();

router.get("/display", authenticate(["user"]), displayAllGallery);

export default router;
