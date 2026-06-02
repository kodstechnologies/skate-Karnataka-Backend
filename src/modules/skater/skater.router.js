import express from "express";
import { afterLoginSkaterForm, DeleteSkater, getAllDiscipline, GetAllSkatingEventCategoriesFull, GetSkaterDigitalIdCard, GetSkaterProfile, GetSkaterResults, GetSkaterResultsEvent, RequestSkaterRsfiChange } from "./skater.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginSkaterFormValidation, getSkaterResultsByEventValidation, SkaterRsfiChangeValidation } from "./skater.validation.js";
import { upload } from "../../middleware/multer.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";

const router = express.Router();


router.post(
    "/v1/after-login-form/:id",
    upload.fields([
        { name: "img", maxCount: 1 },
        { name: "document", maxCount: 10 }
    ]),
    uploadToS3("skaters", { img: "photo", document: "documents" }),
    validate(afterLoginSkaterFormValidation),
    afterLoginSkaterForm
);



// ===  category for events
router.get(
    "/v1/category-all",
    authenticate(["Parent", "Skater", "Club", "District", "State", "Admin"]),
    GetAllSkatingEventCategoriesFull
);
router.get("/v1/discipline", getAllDiscipline);

// profile ===

router.get("/v1/profile",
    authenticate(["Skater"]),
    GetSkaterProfile);

// edit profile — RSFI ID change requires club approval (joined skaters only)
router.patch(
    "/v1/update-rsfi-profile",
    authenticate(["Skater"]),
    validate(SkaterRsfiChangeValidation),
    RequestSkaterRsfiChange
);

// delete profile ==

router.delete("/v1/delete",
    authenticate(["Skater"]),
    DeleteSkater);


// digital id card 

router.get("/v1/digital-id-card",
    authenticate(["Skater"]),
    GetSkaterDigitalIdCard);

// result =====================
router.get(
    "/v1/results-event",
    authenticate(["Skater"]),
    GetSkaterResultsEvent
);

router.get(
    "/v1/results/:id",
    authenticate(["Skater"]),
    validate(getSkaterResultsByEventValidation),
    GetSkaterResults
);

export default router;