import {putObject} from "../util/aws/putObject.js"
import { AppError } from "../util/common/AppError.js";
export const uploadToS3 = (
  folder = "uploads",
  fieldMap = { img: "img" },
  options = {}
) => {
  const arrayTargets = new Set(options.arrayTargets || []);

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

        if (targetField === "documents" || targetField === "rosDocuments") {
          if (!Array.isArray(req.body[targetField])) {
            req.body[targetField] = [];
          }
          req.body[targetField].push({
            url,
            name: file.originalname || "document",
            uploadedAt: new Date(),
          });
          continue;
        }

        if (targetField === "img" && !arrayTargets.has(targetField)) {
          req.body[targetField] = url;
          req.body[`${targetField}Key`] = key;
          continue;
        }

        if (targetField === "img" || arrayTargets.has(targetField)) {
          const arrayField = targetField;
          if (!Array.isArray(req.body[arrayField])) {
            if (
              req.body[arrayField] === undefined ||
              req.body[arrayField] === null ||
              req.body[arrayField] === ""
            ) {
              req.body[arrayField] = [];
            } else {
              req.body[arrayField] = Array.isArray(req.body[arrayField])
                ? [...req.body[arrayField]]
                : [req.body[arrayField]];
            }
          }
          req.body[arrayField].push(url);
          continue;
        }

        if (targetField === "relatedInformationImages") {
          if (!Array.isArray(req.body.relatedInformationImages)) {
            if (
              req.body.relatedInformationImages === undefined ||
              req.body.relatedInformationImages === null ||
              req.body.relatedInformationImages === ""
            ) {
              req.body.relatedInformationImages = [];
            } else {
              req.body.relatedInformationImages = Array.isArray(req.body.relatedInformationImages)
                ? [...req.body.relatedInformationImages]
                : [req.body.relatedInformationImages];
            }
          }
          req.body.relatedInformationImages.push(url);
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