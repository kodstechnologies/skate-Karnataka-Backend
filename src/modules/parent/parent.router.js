import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { afterLoginParentForm, displayAllParent } from "./parent.controller.js";

const router = express.Router()

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllParent)

router.post(
  "/v1/after-login-parent-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
//   validate(afterLoginParentFormValidation),
  afterLoginParentForm
);


export default router;