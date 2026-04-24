import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginOfficialForm, displayAllOfficial, displayOfficialfullDetails } from "./official.controller.js";
import { afterLoginOfficialFormValidation } from "./official.validation.js";

const router = express.Router()

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllOfficial)
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayOfficialfullDetails)

router.post(
  "/v1/after-login-official-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validate(afterLoginOfficialFormValidation),
  afterLoginOfficialForm
);

export default router;