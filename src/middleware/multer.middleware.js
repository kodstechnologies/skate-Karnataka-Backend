import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
  fileSize: 10 * 1024 * 1024, // 10MB
},

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",

      // documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and document files are allowed!"), false);
    }
  },
});