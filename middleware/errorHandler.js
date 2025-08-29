const { logger } = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Prisma errors
const handlePrismaError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      statusCode = 409;
      break;
    case 'P2025':
      // Record not found
      message = 'Record not found';
      statusCode = 404;
      break;
    case 'P2003':
      // Foreign key constraint violation
      message = 'Invalid reference to related record';
      statusCode = 400;
      break;
    case 'P2014':
      // Required relation violation
      message = 'Required relation missing';
      statusCode = 400;
      break;
    default:
      logger.error('Unhandled Prisma error:', { code: error.code, meta: error.meta });
  }

  return new AppError(message, statusCode);
};

// Handle JWT errors
const handleJWTError = (error) => {
  let message = 'Authentication failed';
  
  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    message = 'Token expired';
  }

  return new AppError(message, 401);
};

// Handle validation errors
const handleValidationError = (error) => {
  const errors = error.errors || [];
  const messages = errors.map(err => err.msg || err.message).join(', ');
  return new AppError(`Validation failed: ${messages}`, 400);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      status: err.status
    }
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unknown error:', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error(`Error ${error.statusCode}: ${error.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack
  });

  // Handle specific error types
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError' || (err.errors && Array.isArray(err.errors))) {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = new AppError('Invalid data format', 400);
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 409);
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound
};