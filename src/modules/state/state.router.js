import express from "express";
import { validate } from "../../middleware/validate.multiple.js";
import {createNewState, deleteState, displayAllState, displaySingleStateAllDistricts, updateState} from "./state.controller.js";
import { createStateValidation, editStateValidation } from "./state.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
const router = express.Router();

// 🔹 Get all states
router.get("/v1/all",
  displayAllState
);

// 🔹 Create new state
router.post("/v1/",
    upload.single("img"),
      uploadToS3("img"),
  validate(createStateValidation),
  createNewState
);

// 🔹 Get single state + all districts inside it
router.get("/v1/:id",
  displaySingleStateAllDistricts
);

// 🔹 Update state
router.patch("/v1/:id",
   upload.single("img"),
      uploadToS3("img"),
  validate(editStateValidation),
  updateState
);

// 🔹 Delete state
router.delete("/v1/:id",
  deleteState
);

export default router;