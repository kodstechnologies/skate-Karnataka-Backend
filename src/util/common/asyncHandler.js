export const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        const statusCode = error?.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            statusCode,
            message: error.message || "Something went wrong",
        });
    });
};
