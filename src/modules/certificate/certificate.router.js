import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { applyRequest, createCertificate, deleteCertificates, displayAllCertificate, displaySingleCertificate, updateCertificates } from "./certificate.controller.js";
import { validate } from "../../middleware/validate.multiple.js";
import { createCertificateValidation } from "./certificate.validation.js";

const router = express.Router();


router.get("/v1/all", authenticate(["Skater"]), displayAllCertificate);
router.patch("/v1/request/:id", authenticate(["Skater"]), applyRequest);

// router.get("/v1/state-result/:id",authenticate(["State"]);

router.post("/v1", validate(createCertificateValidation), createCertificate);
router.patch("/v1/:id", updateCertificates);
router.delete("/v1/:id", deleteCertificates);
router.get("/v1/:id", displaySingleCertificate);



export default router;