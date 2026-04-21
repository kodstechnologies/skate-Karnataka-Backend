import {putObject} from "../util/aws/putObject.js"
import { AppError } from "../util/common/AppError.js";
export const uploadToS3 = (folder = "uploads") => {
  return async (req, res, next) => {
    try {
      if (!req.file) return next();

      const { url, key } = await putObject(req.file, folder);

      // attach to request
      req.body.img = url;
      req.body.imgKey = key;
      next();
    } catch (err) {
      next(new AppError(err?.message || "Failed to upload file", 500));
    }
  };
};