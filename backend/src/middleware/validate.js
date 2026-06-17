import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Runs after express-validator chains. Collects validation errors and
 * throws a single 400 with a structured details array.
 */
export const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(ApiError.badRequest("Validation failed", details));
};

export default validate;
