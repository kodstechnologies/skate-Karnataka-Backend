import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginGuestFormValidation } from "../auth/auth.validation.js";
import {afterLoginGuestForm} from "./guest.controller.js";

const router = express.Router()

router.post(
  "/v1/after-login-guest-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validate(afterLoginGuestFormValidation),
  afterLoginGuestForm
);


export default router;