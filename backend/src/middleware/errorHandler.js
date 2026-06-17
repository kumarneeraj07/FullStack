import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/** Fallback 404 for unmatched routes. */
export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler. Converts any thrown error into the standard
 * JSON error envelope: { success:false, message, details }.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for "${field}"`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  if (statusCode === 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === "development" && statusCode === 500 ? { stack: err.stack } : {}),
  });
};
