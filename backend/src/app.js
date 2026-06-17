import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

/**
 * Build and configure the Express application.
 * Kept separate from server.js so it can be imported in tests.
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  app.use("/api", routes);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
