deotenv.config({ path: path.resdolve(__dirname, "../.env") });

const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            const allowOrigins = CORS_ORIGIN.split(",").map((o) => o.trim())
            if (!origin) return callback(null, true);
            if (allowOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log("cors block for origin", origin);
                callback(new Error("Not allow by CORS"))
            }
        }
    })
)

export default app;