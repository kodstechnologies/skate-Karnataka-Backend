import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { restrictUploadedFileFields, uploadAny } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginSchoolFormValidation } from "./school.validation.js";
import { afterLoginSchoolForm, displayAllSchool, displaySchoolFullDetails } from "./school.controller.js";
import { normalizeSchoolFormPayload } from "./schoolFormPayload.js";

const router = express.Router();

const SCHOOL_FORM_FILE_FIELDS = ["img", "document", "documentFile"];

router.get("/v1/all", authenticate(["Admin", "State"]), displayAllSchool);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displaySchoolFullDetails);

router.post(
  "/v1/after-login-school-form/:id",
  uploadAny,
  restrictUploadedFileFields(SCHOOL_FORM_FILE_FIELDS),
  uploadToS3("schools", {
    img: "img",
    document: "documents",
    documentFile: "documents",
  }),
  (req, _res, next) => {
    req.body = normalizeSchoolFormPayload(req.body);
    next();
  },
  validate(afterLoginSchoolFormValidation),
  afterLoginSchoolForm
);

export default router;
