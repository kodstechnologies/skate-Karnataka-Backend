import express from "express";
import { upload } from "../../middleware/multerMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { afterLoginClubForm } from "./academy.controller.js";
import { afterLoginClubFormValidation } from "./academy.validation.js";

const router = express.Router();
router.post(
  "/v1/after-login-club-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validateMultiple(afterLoginClubFormValidation),
  afterLoginClubForm
);

export default router;