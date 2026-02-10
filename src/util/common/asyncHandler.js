export const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        return res.status(400).json({
            success: false,
            message: error.message || "Something went wrong"
        });
    });
};
