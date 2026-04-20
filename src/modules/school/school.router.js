import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginSchoolFormValidation } from "./school.validation.js";
import { afterLoginSchoolForm } from "./school.controller.js";

const router = express.Router()

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