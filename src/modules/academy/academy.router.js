import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginClubForm, displayAllAcademy, displayFullDetailsOfAcademy } from "./academy.controller.js";
import { afterLoginClubFormValidation } from "./academy.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/v1/all" , authenticate(["Admin", "State"]), displayAllAcademy);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayFullDetailsOfAcademy);
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