import { AppError } from "./common/AppError.js";

app.use((err, req, res, next) => {

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }

    // Unexpected server error
    return res.status(500).json({
        status: "error",
        message: "Something went wrong"
    });
});
