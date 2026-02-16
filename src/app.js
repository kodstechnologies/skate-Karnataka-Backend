import express from "express";
import cors from "cors";
import authRouter from "./modules/auth/router/auth.router.js"
import coachRouter from "./modules/coach/router/coach.router.js"
import competitionsRouter from "./modules/competition/router/competition.router.js"
import eventsRouter from "./modules/event/router/event.router.js"
import galleryRouter from "./modules/gallery/router/gallery.router.js"
import notificationRouter from "./modules/notification/router/notefication.router.js"

const app = express();

// parse json 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: true, credentials: true }))

app.get('/', (req, res) => {
    res.send("Welcome to master backend")
})

app.use("/auth", authRouter);
app.use("/coach", coachRouter);
app.use("/competition", competitionsRouter);
app.use("/event", eventsRouter);
app.use("/gallery", galleryRouter);
app.use("/notification", notificationRouter);

export default app;