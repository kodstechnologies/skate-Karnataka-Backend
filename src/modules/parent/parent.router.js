import express from "express";
import { upload } from "../../middleware/multerMiddleware.js";
import { validateMultiple } from "../../middleware/validateMultiple.js";
import {afterLoginParentForm} from "./parent.controller.js";

const router = express.Router()


router.post(
  "/v1/after-login-parent-form/:id",
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "document", maxCount: 1 }
  ]),
//   validateMultiple(afterLoginParentFormValidation),
  afterLoginParentForm
);


export default router;