import {putObject} from "../util/aws/putObject.js"
import { AppError } from "../util/common/AppError.js";
export const uploadToS3 = (folder = "uploads", fieldMap = { img: "img" }) => {
  return async (req, res, next) => {
    try {
      if (!req.file && !req.files) return next();

      if (req.file) {
        const { url, key } = await putObject(req.file, folder);
        const targetField = fieldMap[req.file.fieldname] || req.file.fieldname;
        req.body[targetField] = url;
        req.body[`${targetField}Key`] = key;
        return next();
      }

      const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();

      for (const file of files) {
        const { url, key } = await putObject(file, folder);
        const targetField = fieldMap[file.fieldname] || file.fieldname;

        if (targetField === "documents") {
          if (!Array.isArray(req.body.documents)) {
            req.body.documents = [];
          }
          req.body.documents.push({
            url,
            name: file.originalname || "document",
            uploadedAt: new Date(),
          });
          continue;
        }

        req.body[targetField] = url;
        req.body[`${targetField}Key`] = key;
      }
      next();
    } catch (err) {
      next(new AppError(err?.message || "Failed to upload file", 500));
    }
  };
};