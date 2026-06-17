import mongoose from "mongoose";

/**
 * Connect to MongoDB. Reads the connection string from MONGO_URI.
 * The process exits if the database cannot be reached at startup.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/moviebooking";
  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

export default connectDB;
