import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginClubForm } from "./academy.controller.js";
import { afterLoginClubFormValidation } from "./academy.validation.js";

const router = express.Router();
router.post(
  "/v1/after-login-club-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validate(afterLoginClubFormValidation),
  afterLoginClubForm
);

export default router;