import multer from "multer";

// multer configuration
export const upload = multer({
    storage: multer.memoryStorage(), // store file in RAM

    limits: {
        fileSize: 5 * 1024 * 1024, // max 5MB
    },

    fileFilter: (req, file, cb) => {
        // allowed image types
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // allow upload
        } else {
            cb(new Error("Only image files (JPG, JPEG, PNG, WebP) are allowed!"), false);
        }
    },
});
