import mongoose from "mongoose";

/**
 * A temporary hold on a seat while a user is completing checkout.
 * Locks expire automatically (we treat any lock past `expiresAt` as released).
 */
const lockSchema = new mongoose.Schema(
  {
    seat: { type: String, required: true }, // e.g. "A1"
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * A Show is a screening of a movie on a specific screen at a specific time.
 * It owns the seat-availability state: which seats are permanently booked
 * and which are temporarily locked during checkout.
 */
const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true, index: true },
    screen: { type: mongoose.Schema.Types.ObjectId, ref: "Screen", required: true },
    startTime: { type: Date, required: true, index: true },
    format: { type: String, enum: ["2D", "3D", "IMAX"], default: "2D" },
    language: { type: String, required: true },
    // Permanently sold seats. Never removed once booked (unless a booking is cancelled).
    bookedSeats: { type: [String], default: [] },
    // Active temporary holds during checkout.
    locks: { type: [lockSchema], default: [] },
  },
  { timestamps: true }
);

export const Show = mongoose.model("Show", showSchema);
export default Show;
