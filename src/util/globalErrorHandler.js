import multer from "multer";
import { AppError } from "./common/AppError.js";

export const globalErrorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    // Normalize multer errors into client-safe responses.
    if (err instanceof multer.MulterError) {
        const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "File size exceeds the allowed limit"
                : err.message || "Invalid file upload";

        return res.status(statusCode).json({
            success: false,
            statusCode,
            message,
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
        });
    }

    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Something went wrong",
    });
};
