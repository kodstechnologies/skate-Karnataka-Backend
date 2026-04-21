import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addMedia, displayAllMediaBasedOnSkater } from "./gallery.controller.js";

const router = express.Router()

router.get("/v1/based-on-skater", authenticate(["Skater"]), displayAllMediaBasedOnSkater);
router.post("/v1",authenticate(["Club","District", "State"]), addMedia);

export default router;