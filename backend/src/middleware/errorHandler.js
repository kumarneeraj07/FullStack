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

  // Sequelize unique constraint violation
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const field = err.errors?.[0]?.path || "field";
    message = `Duplicate value for "${field}"`;
  }

  // Sequelize validation error
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = err.errors.map((e) => ({ field: e.path, message: e.message }));
  }

  // Sequelize database error (e.g. invalid UUID format)
  if (err.name === "SequelizeDatabaseError") {
    if (/invalid input syntax for (type )?uuid/i.test(err.message || "")) {
      statusCode = 400;
      message = "Invalid ID format";
    }
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
