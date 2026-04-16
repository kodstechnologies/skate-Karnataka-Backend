import express from "express";
import cors from "cors";
import authRouter from "./modules/auth/auth.router.js"
import coachRouter from "./modules/coach/router/coach.router.js"
import competitionsRouter from "./modules/competition/router/competition.router.js"
import eventsRouter from "./modules/event/event.router.js";
import galleryRouter from "./modules/gallery/router/gallery.router.js"
import notificationRouter from "./modules/notification/router/notefication.router.js"
import clubRouter from "./modules/club/club.router.js";
import districtRouter from "./modules/district/district.router.js";
import stateRouter from "./modules/state/state.router.js";

const app = express();

// parse json 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: true, credentials: true }))

app.get('/health', (req, res) => {
    res.send("Welcome to KRSA backend")
})

app.use("/auth", authRouter);
app.use("/coach", coachRouter);
app.use("/club", clubRouter);
app.use("/district", districtRouter);
app.use("/state",stateRouter);
app.use("/competition", competitionsRouter);
app.use("/event", eventsRouter);
app.use("/gallery", galleryRouter);
app.use("/notification", notificationRouter);

export default app;
