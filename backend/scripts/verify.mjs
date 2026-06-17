/**
 * Standalone verification of the API against an in-memory MongoDB.
 * Not part of the app; used to prove the booking flow + concurrency guard.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import http from "node:http";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri("moviebooking");
process.env.JWT_SECRET = "test_secret";
process.env.NODE_ENV = "test";

const { connectDB } = await import("../src/config/db.js");
const { createApp } = await import("../src/app.js");

await connectDB();
const app = createApp();
const server = app.listen(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api`;

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}`);
  }
}

async function req(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      `${base}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, json: raw ? JSON.parse(raw) : null }));
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

try {
  // Health
  const health = await req("GET", "/health");
  check("GET /health returns 200", health.status === 200 && health.json.success);

  // Register admin + user
  const adminReg = await req("POST", "/auth/register", {
    body: { name: "Admin", email: "admin@test.com", password: "admin123" },
  });
  check("register returns token", adminReg.status === 201 && adminReg.json.data.token);

  // Promote to admin directly in DB (self-register is always 'user').
  const { User } = await import("../src/models/User.js");
  await User.updateOne({ email: "admin@test.com" }, { role: "admin" });
  const adminLogin = await req("POST", "/auth/login", {
    body: { email: "admin@test.com", password: "admin123" },
  });
  const adminToken = adminLogin.json.data.token;
  check("admin login ok", adminLogin.status === 200 && adminToken);

  const userReg = await req("POST", "/auth/register", {
    body: { name: "User", email: "u@test.com", password: "user123" },
  });
  const userToken = userReg.json.data.token;

  const user2Reg = await req("POST", "/auth/register", {
    body: { name: "User2", email: "u2@test.com", password: "user123" },
  });
  const user2Token = user2Reg.json.data.token;

  // RBAC: regular user cannot create a movie
  const forbidden = await req("POST", "/movies", {
    token: userToken,
    body: { title: "X", language: "English", durationMinutes: 100 },
  });
  check("RBAC blocks non-admin movie create (403)", forbidden.status === 403);

  // Validation: admin creates movie with bad data
  const badMovie = await req("POST", "/movies", {
    token: adminToken,
    body: { title: "", language: "", durationMinutes: 0 },
  });
  check("validation rejects bad movie (400)", badMovie.status === 400 && Array.isArray(badMovie.json.details));

  // Admin creates a real movie
  const movieRes = await req("POST", "/movies", {
    token: adminToken,
    body: { title: "Interstellar", language: "English", durationMinutes: 169, genres: ["Sci-Fi"] },
  });
  const movieId = movieRes.json.data._id;
  check("admin creates movie (201)", movieRes.status === 201 && movieId);

  // Search + pagination
  const search = await req("GET", "/movies?search=Interstellar&page=1&limit=5");
  check("movie search + pagination meta", search.status === 200 && search.json.meta.page === 1);

  // Theatre + screen
  const theatreRes = await req("POST", "/theatres", {
    token: adminToken,
    body: { name: "PVR", city: "Bengaluru" },
  });
  const theatreId = theatreRes.json.data._id;
  const screenRes = await req("POST", `/theatres/${theatreId}/screens`, {
    token: adminToken,
    body: {
      name: "Audi 1",
      rows: [
        { label: "A", seats: 5, seatType: "premium", price: 300 },
        { label: "B", seats: 5, seatType: "regular", price: 200 },
      ],
    },
  });
  const screenId = screenRes.json.data._id;
  check("admin creates theatre + screen", theatreId && screenId);

  // Show
  const showRes = await req("POST", "/shows", {
    token: adminToken,
    body: {
      movie: movieId,
      screen: screenId,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      language: "English",
      format: "IMAX",
    },
  });
  const showId = showRes.json.data._id;
  check("admin creates show", showRes.status === 201 && showId);

  // Seat map
  const showDetail = await req("GET", `/shows/${showId}`);
  const layout = showDetail.json.data.seatLayout;
  check("seat layout built (2 rows)", layout && layout.length === 2 && layout[0].seats.length === 5);

  // Booking flow: lock then confirm
  const lockRes = await req("POST", "/bookings/lock", {
    token: userToken,
    body: { showId, seats: ["A1", "A2"] },
  });
  check("lock seats (200)", lockRes.status === 200);

  // Another user cannot lock the same seats
  const lockConflict = await req("POST", "/bookings/lock", {
    token: user2Token,
    body: { showId, seats: ["A2", "A3"] },
  });
  check("conflicting lock rejected (409)", lockConflict.status === 409);

  const confirmRes = await req("POST", "/bookings/confirm", {
    token: userToken,
    body: { showId, seats: ["A1", "A2"] },
  });
  check("confirm booking (201) with amount 600", confirmRes.status === 201 && confirmRes.json.data.totalAmount === 600);

  // Seat now shows as booked
  const showDetail2 = await req("GET", `/shows/${showId}`);
  const a1 = showDetail2.json.data.seatLayout[0].seats.find((s) => s.id === "A1");
  check("A1 is booked after confirm", a1.status === "booked");

  // ---- CONCURRENCY: 10 users race for the same seat, only 1 should win ----
  const racers = Array.from({ length: 10 }, () =>
    req("POST", "/bookings/lock", { token: userToken, body: { showId, seats: ["B1"] } })
  );
  const results = await Promise.all(racers);
  const winners = results.filter((r) => r.status === 200).length;
  check(`concurrent lock on B1: exactly 1 winner (got ${winners})`, winners === 1);

  // Reviews + rating summary
  const reviewRes = await req("POST", `/movies/${movieId}/reviews`, {
    token: userToken,
    body: { rating: 5, comment: "Masterpiece" },
  });
  check("create review (201)", reviewRes.status === 201);
  const movieAfter = await req("GET", `/movies/${movieId}`);
  check("movie rating summary updated", movieAfter.json.data.ratingAverage === 5 && movieAfter.json.data.ratingCount === 1);

  // My bookings
  const mine = await req("GET", "/bookings/me", { token: userToken });
  check("my bookings lists the confirmed booking", mine.json.data.length === 1);

  // Cancel booking frees seats
  const bookingId = confirmRes.json.data._id;
  const cancelRes = await req("DELETE", `/bookings/${bookingId}`, { token: userToken });
  check("cancel booking (200)", cancelRes.status === 200);
  const showDetail3 = await req("GET", `/shows/${showId}`);
  const a1b = showDetail3.json.data.seatLayout[0].seats.find((s) => s.id === "A1");
  check("A1 available again after cancel", a1b.status === "available");
} catch (err) {
  console.error("Verification crashed:", err);
  fail += 1;
} finally {
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  server.close();
  await mongoose.connection.close();
  await mongod.stop();
  process.exit(fail === 0 ? 0 : 1);
}
