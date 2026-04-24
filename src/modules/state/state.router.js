import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import { createNewState, deleteState, displayAllState, displaySingleStateAllDistricts, updateState } from "./state.controller.js";
import { createStateValidation, editStateValidation, getAllStateValidation } from "./state.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
const router = express.Router();

// 🔹 Get all states
router.get("/v1/all",
  authenticate(["Admin", "State"]),
  validate(getAllStateValidation),
  displayAllState
);

// 🔹 Create new state
router.post("/v1/",
  upload.single("img"),
  uploadToS3("img"),
  authenticate(["Admin"]),
  validate(createStateValidation),
  createNewState
);

// 🔹 Get single state + all districts inside it
router.get("/v1/:id",
  authenticate(["Admin", "State"]),
  displaySingleStateAllDistricts
);

// 🔹 Update state
router.patch("/v1/:id",
  upload.single("img"),
  uploadToS3("img"),
  authenticate(["Admin"]),
  validate(editStateValidation),
  updateState
);

// 🔹 Delete state
router.delete("/v1/:id",
  authenticate(["Admin"]),
  deleteState
);

export default router;