import express from "express";
import AppRouter from "./src/app.js";
import { createServer } from "http";
import { connectDB } from "./src/config/db.js";
import { NODE_ENV, PORT } from "./src/config/envConfig.js";
import { seeder } from "./src/seeder/index.js";

const app = express();
const server = createServer(app);
app.use("/", AppRouter);

async function startServer() {
    try {
        await connectDB()
        // ⚠️ Seeder best practice
        if (NODE_ENV !== "production") {
            await seeder()
        }
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        })
    } catch (error) {
        console.log("server startup failed", error)
    }
}

startServer()