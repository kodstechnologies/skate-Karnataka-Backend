import multer from "multer";
import { AppError } from "../util/common/AppError.js";

const multerOptions = {
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 25,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",

      // videos
      "video/mp4",
      "video/webm",
      "video/quicktime",

      // documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only image, video, and document files are allowed", 400), false);
    }
  },
};

export const upload = multer(multerOptions);

/** Accept multipart text fields + files (use instead of .fields() when the app sends both). */
export const uploadAny = multer(multerOptions).any();

const flattenUploadedFiles = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat();
};

/** Reject file parts whose field names are not in the allowlist. */
export const restrictUploadedFileFields =
  (allowedFieldNames = []) =>
  (req, res, next) => {
    const allowed = new Set(allowedFieldNames);
    const invalid = flattenUploadedFiles(req.files).find(
      (file) => !allowed.has(file.fieldname)
    );

    if (invalid) {
      return next(
        new AppError(`Unexpected file field: ${invalid.fieldname}`, 400)
      );
    }

    return next();
  };