import dotenv from "dotenv";

dotenv.config();

/**
 * Centralized, typed access to environment configuration.
 * Keeping this in one place makes the rest of the codebase easy to test.
 */
export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://localhost:5432/moviebooking",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  seatLockTtlSeconds: Number(process.env.SEAT_LOCK_TTL_SECONDS) || 300,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

export default env;
