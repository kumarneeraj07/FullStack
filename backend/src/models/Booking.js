import mongoose from "mongoose";

/**
 * A confirmed (or cancelled) booking made by a user for a set of seats
 * on a single show. The booking lifecycle is tracked via `status`.
 */
const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true, index: true },
    seats: { type: [String], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },
    // Human-friendly reference shown on the ticket.
    reference: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
