import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginGuestFormValidation } from "../auth/auth.validation.js";
import {addContactUs, afterLoginGuestForm, displayContactUs} from "./guest.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addContactUSValidation } from "./guest.validation.js";

const router = express.Router()

router.get("/v1/contact-us", displayContactUs )
router.post("/v1/contact-us",authenticate(["Skater", "Admin"]), validate(addContactUSValidation),addContactUs )

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