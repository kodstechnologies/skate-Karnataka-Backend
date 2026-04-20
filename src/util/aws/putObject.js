import { s3Client } from "./s3-credentials.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const sanitizeName = (name = "file") => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const getExtension = (file) => {
    const original = file?.originalname || "";
    const dotIndex = original.lastIndexOf(".");
    if (dotIndex !== -1 && dotIndex < original.length - 1) {
        return original.slice(dotIndex + 1).toLowerCase();
    }

    const mimeExtMap = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    };
    return mimeExtMap[file?.mimetype] || "bin";
};

export const putObject = async (file, folder = "uploads") => {
    try {
        if (!file || !file.buffer) {
            throw new Error("File buffer is missing or empty");
        }

        const extension = getExtension(file);
        const baseName = sanitizeName((file.originalname || "file").replace(/\.[^/.]+$/, ""));
        const key = `${folder}/${Date.now()}-${baseName}.${extension}`;

        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: file.buffer, // ✅ multer.memoryStorage gives buffer
            ContentType: file.mimetype || "application/octet-stream",
        };

        console.log("Uploading file with params:", params);

        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);

        if (data.$metadata.httpStatusCode !== 200) {
            throw new Error("Failed to upload file to S3");
        }

        const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        console.log("Uploaded file URL:", url);

        return { url, key: params.Key };
    } catch (err) {
        console.error("Error uploading file to S3:", err);
        throw err;
    }
};
