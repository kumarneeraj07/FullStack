import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";
// Import models to register associations before any queries run
import "../src/models/index.js";

let appInstance;

export default async function handler(req, res) {
  await connectDB();
  if (!appInstance) {
    appInstance = createApp();
  }
  appInstance(req, res);
}
