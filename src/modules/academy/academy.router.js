import express from "express";
import { restrictUploadedFileFields, uploadAny } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { afterLoginClubForm, displayAllAcademy, displayFullDetailsOfAcademy, deleteAcademy } from "./academy.controller.js";
import { validateAcademyOrOfficialForm } from "./academyFormValidation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  isOfficialFormPayload,
  normalizeOfficialFormPayload,
} from "../official/officialFormPayload.js";

const router = express.Router();

router.get("/v1/all" , authenticate(["Admin", "State"]), displayAllAcademy);
router.get("/v1/full-details/:id", authenticate(["Admin", "State"]), displayFullDetailsOfAcademy);
router.delete("/v1/:id", authenticate(["Admin", "State"]), deleteAcademy);

const FORM_FILE_FIELDS = [
  "img",
  "document",
  "documents",
  "rosDocument",
  "rosDocuments",
];

const normalizeAcademyFormBody = (req, _res, next) => {
  req.body = normalizeOfficialFormPayload(req.body);
  next();
};

const uploadAcademyOrOfficialFiles = (req, res, next) => {
  const isOfficial = isOfficialFormPayload(req.body);
  const folder = isOfficial ? "officials" : "clubs";
  const fieldMap = isOfficial
    ? { img: "img", document: "documents", documents: "documents" }
    : {
        img: "img",
        document: "documents",
        documents: "documents",
        rosDocument: "rosDocuments",
        rosDocuments: "rosDocuments",
      };

  return uploadToS3(folder, fieldMap)(req, res, next);
};

router.post(
  "/v1/after-login-club-form/:id",
  uploadAny,
  restrictUploadedFileFields(FORM_FILE_FIELDS),
  normalizeAcademyFormBody,
  uploadAcademyOrOfficialFiles,
  validateAcademyOrOfficialForm,
  afterLoginClubForm
);

export default router;