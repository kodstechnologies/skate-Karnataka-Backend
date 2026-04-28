import express from "express";
import cors from "cors";
import authRouter from "./modules/auth/auth.router.js";
// === roles ===
import skaterRouter from "./modules/skater/skater.router.js";
import academyRouter from "./modules/academy/academy.router.js";
import adminRouter from "./modules/admin/admin.router.js";
import guestRouter from "./modules/guest/guest.router.js";
import officialRouter from "./modules/official/official.router.js";
import parentRouter from "./modules/parent/parent.router.js";
import schoolRouter from "./modules/school/school.router.js";
// ==
// import coachRouter from "./modules/coach/coach.router.js"
import competitionsRouter from "./modules/competition/competition.router.js";
import eventsRouter from "./modules/event/event.router.js";
import galleryRouter from "./modules/gallery/gallery.router.js";
import notificationRouter from "./modules/notification/notification.router.js"
import clubRouter from "./modules/club/club.router.js";
import districtRouter from "./modules/district/district.router.js";
import stateRouter from "./modules/state/state.router.js";
import reportRouter from "./modules/report/report.router.js";
import certificateRouter from "./modules/certificate/certificate.router.js";
import { CORS_ORIGIN } from "./config/envConfig.js";
import { AppError } from "./util/common/AppError.js";
import { globalErrorHandler } from "./util/globalErrorHandler.js";

const app = express();

// parse json 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight cookie parsing so auth middleware can read cookie tokens.
app.use((req, _res, next) => {
    const rawCookies = req.headers.cookie;
    req.cookies = {};

    if (!rawCookies) {
        return next();
    }

    rawCookies.split(";").forEach((cookie) => {
        const [key, ...valueParts] = cookie.split("=");
        if (!key) return;

        const cookieKey = key.trim();
        const cookieValue = decodeURIComponent(valueParts.join("=").trim() || "");
        req.cookies[cookieKey] = cookieValue;
    });

    next();
});

const allowedOrigins = (CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
}));

app.get('/health', (req, res) => {
    res.send("Welcome to KRSA backend")
})

app.use("/auth", authRouter);
app.use("/skater", skaterRouter);
app.use("/academy", academyRouter);
app.use("/admin", adminRouter);
app.use("/guest", guestRouter);
app.use("/official", officialRouter);
app.use("/parent", parentRouter);
app.use("/school", schoolRouter);

// app.use("/coach", coachRouter);
app.use("/club", clubRouter);
app.use("/district", districtRouter);
app.use("/state",stateRouter);
app.use("/competition", competitionsRouter);
app.use("/event", eventsRouter);
app.use("/gallery", galleryRouter);
app.use("/report", reportRouter);
app.use("/certificate", certificateRouter);
app.use("/notification", notificationRouter);

app.use((req, res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

export default app;
