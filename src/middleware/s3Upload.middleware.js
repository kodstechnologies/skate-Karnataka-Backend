import {putObject} from "../util/aws/putObject.js"
export const uploadToS3 = (folder = "uploads") => {
  return async (req, res, next) => {
    try {
      if (!req.file) return next();

      const { url, key } = await putObject(req.file, folder);

      // attach to request
      req.body.img = url;
      req.body.imgKey = key;
console.log("jjj")
      next();
    } catch (err) {
      next(err);
    }
  };
};