import express from "express";
import { upload } from "../../middleware/multer.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginGuestFormValidation } from "../auth/auth.validation.js";
import {
  addContactUs,
  addFeedBack,
  addNews,
  afterLoginGuestForm,
  deleteNews,
  displayContactUs,
  displayFeedback,
  displayStateLatestEvents,
  displayStateLatestSingleEvents,
  displayNews,
  displaySingleNews,
  updateNews,
  displayDisciplines,
  addDiscipline,
  updateDiscipline,
  deleteDiscipline,
  displayCircular,
  addCircular,
  updateCircular,
  deleteCircular,
} from "./guest.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  addContactUSValidation,
  addDisciplineValidation,
  addFeedBackValidation,
  addNewsValidation,
  disciplineByIdValidation,
  addCircularValidation,
  updateCircularValidation,
  circularByIdValidation,
  eventByIdValidation,
  newsByIdValidation,
  updateDisciplineValidation,
  updateNewsValidation,
} from "./guest.validation.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router()

// contact - us =======================
router.get("/v1/contact-us", displayContactUs)
router.post("/v1/contact-us", authenticate(["Skater", "Admin"]), validate(addContactUSValidation), addContactUs)

// FeedBack ===========================

router.get("/v1/feed-back", displayFeedback);
router.post("/v1/feed-back", validate(addFeedBackValidation), addFeedBack);

// news ======================

router.get("/v1/news", displayNews);
router.post(
  "/v1/news",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(addNewsValidation),
  addNews
);
router.get("/v1/news/:id", validate(newsByIdValidation), displaySingleNews);
router.patch(
  "/v1/news/:id",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(updateNewsValidation),
  updateNews
);
router.delete(
  "/v1/news/:id",
  authenticate(["Skater", "Admin"]),
  validate(newsByIdValidation),
  deleteNews
);

// ============ event & championship 

router.get("/v1/events", displayStateLatestEvents);
router.get("/v1/events/:id", validate(eventByIdValidation), displayStateLatestSingleEvents);

// ====================== Disciplines  

router.get("/v1/discipline", displayDisciplines);
router.post(
  "/v1/discipline",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(addDisciplineValidation),
  addDiscipline
);
router.patch(
  "/v1/discipline/:id",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(updateDisciplineValidation),
  updateDiscipline
);
router.delete(
  "/v1/discipline/:id",
  authenticate(["Skater", "Admin"]),
  validate(disciplineByIdValidation),
  deleteDiscipline
);

// Circular====================

router.get("/v1/circular", displayCircular);
router.post(
  "/v1/circular",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(addCircularValidation),
  addCircular
);
router.patch(
  "/v1/circular/:id",
  authenticate(["Skater", "Admin"]),
  upload.single("img"),
  uploadToS3("img"),
  validate(updateCircularValidation),
  updateCircular
);
router.delete(
  "/v1/circular/:id",
  authenticate(["Skater", "Admin"]),
  validate(circularByIdValidation),
  deleteCircular
);

// =============
router.post(
  "/v1/after-login-guest-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
  validate(afterLoginGuestFormValidation),
  afterLoginGuestForm
);


export default router;