import mongoose from "mongoose";
import { MONGODB_URI, DB_NAME } from "./envConfig.js";
console.log("🚀 ~ MONGODB_URI:===", MONGODB_URI)


export async function connectDB() {
    try {
        console.log("📡 Connecting to MongoDB Atlas...");

        const conn = await mongoose.connect(
            `${MONGODB_URI}/${DB_NAME}?retryWrites=true&w=majority`,
            {
                serverSelectionTimeoutMS: 10000,
            }
        );

        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
}
