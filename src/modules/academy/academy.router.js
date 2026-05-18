import express from "express";
import { restrictUploadedFileFields, uploadAny } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginClubForm, displayAllAcademy, displayFullDetailsOfAcademy } from "./academy.controller.js";
import { afterLoginClubFormValidation } from "./academy.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/v1/all" , authenticate(["Admin", "State"]), displayAllAcademy);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayFullDetailsOfAcademy);
const CLUB_FORM_FILE_FIELDS = [
  "img",
  "document",
  "documents",
  "rosDocument",
  "rosDocuments",
];

router.post(
  "/v1/after-login-club-form/:id",
  uploadAny,
  restrictUploadedFileFields(CLUB_FORM_FILE_FIELDS),
  uploadToS3("clubs", {
    img: "img",
    document: "documents",
    documents: "documents",
    rosDocument: "rosDocuments",
    rosDocuments: "rosDocuments",
  }),
  validate(afterLoginClubFormValidation),
  afterLoginClubForm
);

export default router;