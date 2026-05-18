import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { restrictUploadedFileFields, uploadAny } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginOfficialForm, displayAllOfficial, displayOfficialfullDetails } from "./official.controller.js";
import { afterLoginOfficialFormValidation } from "./official.validation.js";

const router = express.Router();

const OFFICIAL_FORM_FILE_FIELDS = ["img", "document", "documents"];

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllOfficial);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayOfficialfullDetails);

router.post(
  "/v1/after-login-official-form/:id",
  uploadAny,
  restrictUploadedFileFields(OFFICIAL_FORM_FILE_FIELDS),
  uploadToS3("officials", {
    img: "img",
    document: "documents",
    documents: "documents",
  }),
  validate(afterLoginOfficialFormValidation),
  afterLoginOfficialForm
);

export default router;