import mongoose from "mongoose";

/**
 * A screen (auditorium) belongs to a theatre and defines its seat layout.
 * The layout is a grid of rows; each row has a label (A, B, C...) and a
 * number of seats. Seats are addressed as "<row><number>", e.g. "A1".
 */
const rowSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "A"
    seats: { type: Number, required: true, min: 1 }, // seats in this row
    seatType: {
      type: String,
      enum: ["regular", "premium", "recliner"],
      default: "regular",
    },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const screenSchema = new mongoose.Schema(
  {
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true, index: true },
    name: { type: String, required: true }, // e.g. "Audi 1"
    rows: { type: [rowSchema], required: true },
  },
  { timestamps: true }
);

// Convenience virtual: total seat capacity of the screen.
screenSchema.virtual("capacity").get(function capacity() {
  return this.rows.reduce((sum, r) => sum + r.seats, 0);
});

screenSchema.set("toJSON", { virtuals: true });
screenSchema.set("toObject", { virtuals: true });

export const Screen = mongoose.model("Screen", screenSchema);
export default Screen;
