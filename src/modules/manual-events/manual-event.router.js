import express from "express";
import multer from "multer";
import { uploadToS3 } from "../../middleware/s3Upload.middleware.js";
import {
    createManualEvent,
    updateManualEvent,
    getAllManualEvents,
    getManualEventById,
    deleteManualEvent,
    uploadManualEventAttendance,
} from "./manual-event.controller.js";

const router = express.Router();

const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
    { name: "circularDocument", maxCount: 1 },
    { name: "excelTemplate", maxCount: 1 },
]);

const s3Upload = uploadToS3("manual-events", {
    circularDocument: "circularDocument",
    excelTemplate: "excelTemplate",
});

const attendanceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
}).single("skaterExcelDocument");

const attendanceS3Upload = uploadToS3("manual-events/attendance", {
    skaterExcelDocument: "skaterExcelDocument",
});

// All manual events display (GET / and GET /v1/)
router.get("/", getAllManualEvents);

// Create manual event (POST / and POST /v1/)
router.post("/", fileUpload, s3Upload, createManualEvent);

// One manual event full details display (GET /:id and GET /v1/:id)
router.get("/:id", getManualEventById);

// Edit manual event (PATCH/PUT /:id and /v1/:id)
router.patch("/:id", fileUpload, s3Upload, updateManualEvent);

// Delete manual event (DELETE /:id and /v1/:id)
router.delete("/:id", deleteManualEvent);

// District upload / re-upload skater Excel attendance document
router.post("/:id/attendance", attendanceUpload, attendanceS3Upload, uploadManualEventAttendance);

export default router;
