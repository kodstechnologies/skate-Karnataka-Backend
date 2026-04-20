import express from "express";
import { upload } from "../../middleware/multerMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { afterLoginSchoolFormValidation } from "./school.validation.js";
import { afterLoginSchoolForm } from "./school.controller.js";

const router = express.Router()

router.post(
  "/v1/after-login-school-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validateMultiple(afterLoginSchoolFormValidation),
  afterLoginSchoolForm
);

export default router;