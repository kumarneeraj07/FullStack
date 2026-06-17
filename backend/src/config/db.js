import mongoose from "mongoose";

/**
 * Cached connection promise for serverless environments.
 * Prevents opening a new connection on every invocation when the
 * function instance is reused (warm start).
 */
let cached = global.__mongooseConnection;

if (!cached) {
  cached = global.__mongooseConnection = { promise: null, conn: null };
}

/**
 * Connect to MongoDB. Reads the connection string from MONGO_URI.
 * Uses a cached promise so that serverless warm starts reuse the
 * existing connection instead of creating a new one each time.
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/moviebooking";
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(uri).then((m) => {
      console.log(`MongoDB connected: ${m.connection.host}/${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }

  return cached.conn;
}

export default connectDB;
