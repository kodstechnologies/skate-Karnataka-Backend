import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT;
const DB_NAME = process.env.DB_NAME;
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const NODE_ENV = process.env.NODE_ENV || "development";

//  ================= JWT TOKENS =================


const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES;

// ================= admin credential =================
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME;
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME;
const ADMIN_PHONE_NO = process.env.ADMIN_PHONE_NO;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;

// ================= phone otp =================

const SENDER_ID = process.env.SENDER_ID;
const TEMPLATE_ID = process.env.TEMPLATE_ID;

// ================= AWS s3 =================

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

export {
    PORT,
    MONGODB_URI,
    DB_NAME,
    CORS_ORIGIN,

    NODE_ENV,
    //  ================= JWT TOKENS =================

    JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES,
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES,

    // ================= admin credential =================

    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
    ADMIN_PHONE_NO,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_ADDRESS,

    // ================= phone otp =================

    SENDER_ID,
    TEMPLATE_ID,

    // ================= AWS s3 =================

    AWS_REGION,
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
    AWS_S3_BUCKET,
}