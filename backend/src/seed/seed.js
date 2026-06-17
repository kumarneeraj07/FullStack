/**
 * Seed the database with demo data:
 *   - an admin and a regular user
 *   - a few movies
 *   - one theatre with a screen (seat layout)
 *   - upcoming shows
 *
 * Run with: npm run seed
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Movie } from "../models/Movie.js";
import { Theatre } from "../models/Theatre.js";
import { Screen } from "../models/Screen.js";
import { Show } from "../models/Show.js";
import { Booking } from "../models/Booking.js";
import { Review } from "../models/Review.js";

async function seed() {
  await connectDB();
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Screen.deleteMany({}),
    Show.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log("Creating users...");
  await User.create({
    name: "Admin",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
  });
  await User.create({
    name: "Demo User",
    email: "user@example.com",
    password: "user123",
    role: "user",
  });

  console.log("Creating movies...");
  const movies = await Movie.create([
    {
      title: "Interstellar",
      description: "A team travels through a wormhole in search of a new home for humanity.",
      language: "English",
      genres: ["Sci-Fi", "Drama"],
      durationMinutes: 169,
      certification: "UA",
      posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      releaseDate: new Date("2014-11-07"),
    },
    {
      title: "Inception",
      description: "A thief who steals corporate secrets through dream-sharing technology.",
      language: "English",
      genres: ["Sci-Fi", "Thriller"],
      durationMinutes: 148,
      certification: "UA",
      posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
      releaseDate: new Date("2010-07-16"),
    },
    {
      title: "Dune: Part Two",
      description: "Paul Atreides unites with the Fremen to wage war against House Harkonnen.",
      language: "English",
      genres: ["Sci-Fi", "Adventure"],
      durationMinutes: 166,
      certification: "UA",
      posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      releaseDate: new Date("2024-03-01"),
    },
  ]);

  console.log("Creating theatre + screen...");
  const theatre = await Theatre.create({
    name: "PVR Grand",
    city: "Bengaluru",
    address: "MG Road, Bengaluru",
  });

  const screen = await Screen.create({
    theatre: theatre._id,
    name: "Audi 1",
    rows: [
      { label: "A", seats: 10, seatType: "premium", price: 350 },
      { label: "B", seats: 10, seatType: "premium", price: 350 },
      { label: "C", seats: 12, seatType: "regular", price: 250 },
      { label: "D", seats: 12, seatType: "regular", price: 250 },
      { label: "E", seats: 8, seatType: "recliner", price: 500 },
    ],
  });

  console.log("Creating shows...");
  const now = new Date();
  const makeTime = (daysFromNow, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await Show.create([
    {
      movie: movies[0]._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: makeTime(0, 18),
      format: "IMAX",
      language: "English",
    },
    {
      movie: movies[0]._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: makeTime(0, 21),
      format: "2D",
      language: "English",
    },
    {
      movie: movies[1]._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: makeTime(1, 19),
      format: "2D",
      language: "English",
    },
    {
      movie: movies[2]._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: makeTime(1, 16),
      format: "3D",
      language: "English",
    },
  ]);

  console.log("\nSeed complete!");
  console.log("  Admin login: admin@example.com / admin123");
  console.log("  User login:  user@example.com / user123");

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.connection.close();
  process.exit(1);
});
