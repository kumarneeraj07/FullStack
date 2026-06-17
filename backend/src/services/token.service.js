import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/** Sign a JWT for an authenticated user. `sub` is the user id. */
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}
