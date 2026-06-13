const path = require('path');
const AppError = require('../utils/AppError');

/**
 * Handle Mongoose Cast Error (Invalid ID)
 */
const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Field Error
 */
const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

/**
 * Handle JWT Invalid Error
 */
const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

/**
 * Response for Development Environment (Detailed)
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Response for Production Environment (Clean)
 */
const sendErrorProd = (err, req, res) => {
    // 1. Check if it's a 404 for a Browser Request (not API)
    if (err.statusCode === 404 && !req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/auth')) {
        return res.status(404).sendFile(path.join(__dirname, '../404.html'));
    }

    // 2. Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // 3. Programming or other unknown error: NEVER expose internals to client in production
    console.error('❌ ERROR:', err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong on our end. Please try again later.'
    });
};

/**
 * Global Error Handling Middleware
 */
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Specific Mongoose/DB Error Handling
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};
