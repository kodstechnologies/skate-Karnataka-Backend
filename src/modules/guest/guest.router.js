import express from "express";
import { upload } from "../../middleware/multerMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { afterLoginGuestFormValidation } from "../auth/auth.validation.js";
import {afterLoginGuestForm} from "./guest.controller.js";

const router = express.Router()

router.post(
  "/v1/after-login-guest-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validateMultiple(afterLoginGuestFormValidation),
  afterLoginGuestForm
);


export default router;