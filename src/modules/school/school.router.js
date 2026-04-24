import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginSchoolFormValidation } from "./school.validation.js";
import { afterLoginSchoolForm, displayAllSchool, displaySchoolFullDetails } from "./school.controller.js";

const router = express.Router()

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllSchool);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displaySchoolFullDetails);


router.post(
  "/v1/after-login-school-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validate(afterLoginSchoolFormValidation),
  afterLoginSchoolForm
);

export default router;