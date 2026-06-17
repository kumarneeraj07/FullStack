import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

/**
 * Build the list of allowed CORS origins.
 * Supports a comma-separated CLIENT_URL env var so the app works
 * both locally and on Vercel without code changes.
 */
function getAllowedOrigins() {
  const raw = env.clientUrl || "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Build and configure the Express application.
 * Kept separate from server.js so it can be imported in tests.
 */
export function createApp() {
  const app = express();

  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  app.use("/api", routes);
  // Also mount at root — Vercel experimentalServices may strip the prefix
  // and deliver just /movies instead of /api/movies
  app.use("/", routes);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
