import express from "express";
import { uploadAny } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { afterLoginParentForm, displayAllParent, displayParentFullDetails } from "./parent.controller.js";

const router = express.Router()

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllParent)
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayParentFullDetails)

router.post(
  "/v1/after-login-parent-form/:id",
  uploadAny,
//   validate(afterLoginParentFormValidation),
  afterLoginParentForm
);


export default router;