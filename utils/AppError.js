/**
 * AppError Class
 * Custom error class for operational errors (errors we can predict)
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // To distinguish between operational and programming errors

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
