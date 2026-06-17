import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Verifies the Bearer JWT, loads the user, and attaches it to req.user.
 * Centralized JWT validation — used by the API gateway-style guard on
 * every protected route.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized("Authentication token missing");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw ApiError.unauthorized("User no longer exists");

  req.user = user;
  next();
});

/**
 * Role-Based Access Control. Pass the roles allowed to access the route.
 * Example: router.post("/", authenticate, authorize("admin"), handler)
 */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
