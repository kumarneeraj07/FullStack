import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";
// Import models to register associations before any queries run
import "../src/models/index.js";

let appInstance;

export default async function handler(req, res) {
  try {
    await connectDB();
    if (!appInstance) {
      appInstance = createApp();
    }
    appInstance(req, res);
  } catch (err) {
    console.error("Serverless handler error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
}
