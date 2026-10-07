export function errorMiddleware(error, req, res, next) {
    console.error("Request error:", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        error: error.message
    });

    if (res.headersSent) {
        return next(error);
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: {
            message:
                statusCode === 500
                    ? "Internal server error"
                    : error.message
        },
        requestId: req.requestId
    });
}