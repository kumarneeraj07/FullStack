import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    language: { type: String, required: true, index: true },
    genres: { type: [String], default: [], index: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    certification: { type: String, default: "UA" }, // U / UA / A
    posterUrl: { type: String, default: "" },
    releaseDate: { type: Date },
    // Denormalized rating summary, kept in sync when reviews change.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index to support keyword search across title/description.
movieSchema.index({ title: "text", description: "text" });

export const Movie = mongoose.model("Movie", movieSchema);
export default Movie;
