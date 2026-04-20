import express from "express";
import { upload } from "../../middleware/multerMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import { afterLoginOfficialForm } from "./official.controller.js";
import { afterLoginOfficialFormValidation } from "./official.validation.js";

const router = express.Router()

router.post(
  "/v1/after-login-official-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validateMultiple(afterLoginOfficialFormValidation),
  afterLoginOfficialForm
);

export default router;