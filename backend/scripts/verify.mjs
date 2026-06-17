/**
 * Full integration test suite for the MovieBooking API.
 *
 * Uses SQLite in-memory as the test database so no external services are
 * required. Covers: health, auth, RBAC, movie CRUD + search + pagination,
 * theatre + screen, show + seat-map, booking lock/confirm/cancel, concurrency,
 * and reviews + rating updates.
 */

// ---- Environment setup (MUST come before any app imports) ----
process.env.DATABASE_URL = "sqlite::memory:";
process.env.JWT_SECRET = "test_secret";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.SEAT_LOCK_TTL_SECONDS = "300";

import http from "node:http";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}`);
  }
}

/**
 * Minimal HTTP helper that sends a request to the test server and returns
 * { status, body } where body is parsed JSON.
 */
function request(server, method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const opts = {
      hostname: "127.0.0.1",
      port: addr.port,
      path,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || "{}") });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;

try {
  // ---- Bootstrap ----
  console.log("--- Bootstrapping SQLite in-memory database ---");

  // Import sequelize and connectDB (will use sqlite::memory: via DATABASE_URL)
  const { sequelize, connectDB } = await import("../src/config/db.js");
  // Import models to register associations
  const { User } = await import("../src/models/index.js");
  // Connect + sync tables
  await connectDB();

  // Create an admin user directly in the DB (register endpoint forces role=user)
  const adminUser = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: "admin123",
    role: "admin",
  });

  // Import the Express app
  const { createApp } = await import("../src/app.js");
  const app = createApp();

  // Start an HTTP server on a random port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log(`Test server listening on port ${port}\n`);

  // ============================================================
  // 1. HEALTH CHECK
  // ============================================================
  console.log("--- Health Check ---");
  const health = await request(server, "GET", "/api/health");
  check("GET /api/health returns 200", health.status === 200);
  check("health response has success: true", health.body.success === true);

  // ============================================================
  // 2. AUTH: REGISTER + LOGIN
  // ============================================================
  console.log("\n--- Auth: Register + Login ---");

  const regUser = await request(server, "POST", "/api/auth/register", {
    body: { name: "User", email: "user@test.com", password: "user123" },
  });
  check("Register user returns 201", regUser.status === 201);

  const regUser2 = await request(server, "POST", "/api/auth/register", {
    body: { name: "User2", email: "user2@test.com", password: "user456" },
  });
  check("Register user2 returns 201", regUser2.status === 201);

  // Duplicate email
  const regDup = await request(server, "POST", "/api/auth/register", {
    body: { name: "Dup", email: "admin@test.com", password: "dup123" },
  });
  check("Duplicate email is rejected", regDup.status >= 400);

  // Login admin (was created directly in DB)
  const loginAdmin = await request(server, "POST", "/api/auth/login", {
    body: { email: "admin@test.com", password: "admin123" },
  });
  check("Admin login returns 200", loginAdmin.status === 200);
  const adminToken = loginAdmin.body.data?.token;
  check("Admin login returns token", typeof adminToken === "string" && adminToken.length > 0);

  const loginUser = await request(server, "POST", "/api/auth/login", {
    body: { email: "user@test.com", password: "user123" },
  });
  check("User login returns 200", loginUser.status === 200);
  const userToken = loginUser.body.data?.token;
  check("User login returns token", typeof userToken === "string" && userToken.length > 0);

  const loginUser2 = await request(server, "POST", "/api/auth/login", {
    body: { email: "user2@test.com", password: "user456" },
  });
  const user2Token = loginUser2.body.data?.token;

  // Wrong password
  const badLogin = await request(server, "POST", "/api/auth/login", {
    body: { email: "admin@test.com", password: "wrong" },
  });
  check("Wrong password returns 401", badLogin.status === 401);

  // GET /api/auth/me
  const me = await request(server, "GET", "/api/auth/me", { token: adminToken });
  check("GET /api/auth/me returns user info", me.status === 200 && me.body.data?.user?.email === "admin@test.com");

  // ============================================================
  // 3. RBAC
  // ============================================================
  console.log("\n--- RBAC ---");

  const rbacMovie = await request(server, "POST", "/api/movies", {
    body: { title: "RBAC Test", language: "English", durationMinutes: 90 },
    token: userToken,
  });
  check("Non-admin cannot create movie (403)", rbacMovie.status === 403);

  const noAuth = await request(server, "GET", "/api/auth/me");
  check("No token returns 401", noAuth.status === 401);

  // ============================================================
  // 4. MOVIE CRUD + SEARCH + PAGINATION
  // ============================================================
  console.log("\n--- Movie CRUD ---");

  const movie1 = await request(server, "POST", "/api/movies", {
    body: {
      title: "Interstellar",
      description: "Space epic",
      language: "English",
      genres: ["Sci-Fi", "Drama"],
      durationMinutes: 169,
      certification: "UA",
      releaseDate: "2014-11-07",
    },
    token: adminToken,
  });
  check("Create movie returns 201", movie1.status === 201);
  const movieId1 = movie1.body.data?.id || movie1.body.data?._id;
  check("Movie has an ID", !!movieId1);

  const movie2 = await request(server, "POST", "/api/movies", {
    body: {
      title: "Inception",
      description: "Dream heist",
      language: "English",
      genres: ["Sci-Fi", "Thriller"],
      durationMinutes: 148,
      certification: "UA",
      releaseDate: "2010-07-16",
    },
    token: adminToken,
  });
  check("Create second movie", movie2.status === 201);
  const movieId2 = movie2.body.data?.id || movie2.body.data?._id;

  const movie3 = await request(server, "POST", "/api/movies", {
    body: {
      title: "Dune Part Two",
      description: "Desert war",
      language: "English",
      genres: ["Sci-Fi", "Adventure"],
      durationMinutes: 166,
      certification: "UA",
      releaseDate: "2024-03-01",
    },
    token: adminToken,
  });
  check("Create third movie", movie3.status === 201);

  // List movies
  const movieList = await request(server, "GET", "/api/movies");
  check("List movies returns 200", movieList.status === 200);
  check("List movies has items", Array.isArray(movieList.body.data) && movieList.body.data.length >= 3);

  // Pagination
  const page1 = await request(server, "GET", "/api/movies?page=1&limit=2");
  check("Pagination: page 1 has 2 items", page1.body.data?.length === 2);
  check("Pagination: meta present", !!page1.body.meta);

  // Search
  const search = await request(server, "GET", "/api/movies?search=inception");
  check("Search finds Inception", search.body.data?.length >= 1);

  // Get single movie
  const getMovie = await request(server, "GET", `/api/movies/${movieId1}`);
  check("Get movie by id returns 200", getMovie.status === 200);
  check("Get movie returns correct title", getMovie.body.data?.title === "Interstellar");

  // Update movie
  const updated = await request(server, "PUT", `/api/movies/${movieId1}`, {
    body: { description: "Updated description" },
    token: adminToken,
  });
  check("Update movie returns 200", updated.status === 200);

  // Delete movie (movie3 - not needed for booking tests)
  const movieId3 = movie3.body.data?.id || movie3.body.data?._id;
  const del = await request(server, "DELETE", `/api/movies/${movieId3}`, { token: adminToken });
  check("Delete movie returns 200", del.status === 200);

  // Verify deleted
  const getDeleted = await request(server, "GET", `/api/movies/${movieId3}`);
  check("Deleted movie returns 404", getDeleted.status === 404);

  // ============================================================
  // 5. THEATRE + SCREEN
  // ============================================================
  console.log("\n--- Theatre + Screen ---");

  const theatre = await request(server, "POST", "/api/theatres", {
    body: { name: "PVR Grand", city: "Bengaluru", address: "MG Road" },
    token: adminToken,
  });
  check("Create theatre returns 201", theatre.status === 201);
  const theatreId = theatre.body.data?.id || theatre.body.data?._id;
  check("Theatre has ID", !!theatreId);

  const screenReq = await request(server, "POST", `/api/theatres/${theatreId}/screens`, {
    body: {
      name: "Audi 1",
      rows: [
        { label: "A", seats: 5, seatType: "premium", price: 350 },
        { label: "B", seats: 5, seatType: "regular", price: 250 },
      ],
    },
    token: adminToken,
  });
  check("Create screen returns 201", screenReq.status === 201);
  const screenId = screenReq.body.data?.id || screenReq.body.data?._id;
  check("Screen has ID", !!screenId);

  // List theatres
  const theatreList = await request(server, "GET", "/api/theatres");
  check("List theatres returns 200", theatreList.status === 200);

  // Get theatre
  const getTheatre = await request(server, "GET", `/api/theatres/${theatreId}`);
  check("Get theatre returns 200", getTheatre.status === 200);

  // ============================================================
  // 6. SHOW + SEAT MAP
  // ============================================================
  console.log("\n--- Show + Seat Map ---");

  const futureTime = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const showReq = await request(server, "POST", "/api/shows", {
    body: {
      movie: movieId1,
      theatreId,
      screen: screenId,
      startTime: futureTime,
      format: "IMAX",
      language: "English",
    },
    token: adminToken,
  });
  check("Create show returns 201", showReq.status === 201);
  const showId = showReq.body.data?.id || showReq.body.data?._id;
  check("Show has ID", !!showId);

  // List shows
  const showList = await request(server, "GET", "/api/shows");
  check("List shows returns 200", showList.status === 200);

  // Get show (includes seat map)
  const getShow = await request(server, "GET", `/api/shows/${showId}`);
  check("Get show returns 200", getShow.status === 200);
  const seatLayout = getShow.body.data?.seatLayout;
  check("Show has seat layout data", Array.isArray(seatLayout) && seatLayout.length > 0);

  // ============================================================
  // 7. BOOKING: LOCK / CONFIRM / CANCEL
  // ============================================================
  console.log("\n--- Booking: Lock / Confirm / Cancel ---");

  // Lock seats
  const lockRes = await request(server, "POST", "/api/bookings/lock", {
    body: { showId, seats: ["A1", "A2"] },
    token: userToken,
  });
  check("Lock seats returns 200", lockRes.status === 200);
  check("Lock response has expiresAt", !!lockRes.body.data?.expiresAt);

  // Confirm booking
  const confirmRes = await request(server, "POST", "/api/bookings/confirm", {
    body: { showId, seats: ["A1", "A2"] },
    token: userToken,
  });
  check("Confirm booking returns 200/201", confirmRes.status === 200 || confirmRes.status === 201);
  const bookingId = confirmRes.body.data?.id || confirmRes.body.data?._id;
  check("Booking has ID", !!bookingId);
  check("Booking has reference", !!confirmRes.body.data?.reference);

  // My bookings
  const myBookings = await request(server, "GET", "/api/bookings/me", { token: userToken });
  check("My bookings returns 200", myBookings.status === 200);
  check("My bookings has at least 1", Array.isArray(myBookings.body.data) && myBookings.body.data.length >= 1);

  // Cancel booking
  const cancelRes = await request(server, "DELETE", `/api/bookings/${bookingId}`, { token: userToken });
  check("Cancel booking returns 200", cancelRes.status === 200);

  // Verify seats freed - lock same seats again should work
  const lockAgain = await request(server, "POST", "/api/bookings/lock", {
    body: { showId, seats: ["A1", "A2"] },
    token: userToken,
  });
  check("Re-lock after cancel succeeds", lockAgain.status === 200);

  // Release the re-lock
  const releaseRes = await request(server, "POST", "/api/bookings/release", {
    body: { showId, seats: ["A1", "A2"] },
    token: userToken,
  });
  check("Release seats returns 200", releaseRes.status === 200);

  // ============================================================
  // 8. CONCURRENCY: Unique constraint prevents double-locking
  // ============================================================
  console.log("\n--- Concurrency: Seat Lock Uniqueness ---");

  // Create a second show for concurrency test to avoid interference
  const futureTime2 = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow
  const show2Req = await request(server, "POST", "/api/shows", {
    body: {
      movie: movieId2,
      theatreId,
      screen: screenId,
      startTime: futureTime2,
      format: "2D",
      language: "English",
    },
    token: adminToken,
  });
  const showId2 = show2Req.body.data?.id || show2Req.body.data?._id;

  // SQLite does not support true concurrent transactions (only one writer at a time),
  // so we test the unique constraint sequentially: lock a seat, then try to lock
  // the same seat from another user - should get 409.
  const firstLock = await request(server, "POST", "/api/bookings/lock", {
    body: { showId: showId2, seats: ["B3"] },
    token: userToken,
  });
  check("First lock on B3 succeeds (200)", firstLock.status === 200);

  const secondLock = await request(server, "POST", "/api/bookings/lock", {
    body: { showId: showId2, seats: ["B3"] },
    token: user2Token,
  });
  check("Second lock on same seat gets 409", secondLock.status === 409);

  // Verify that locking a different seat still works
  const differentSeat = await request(server, "POST", "/api/bookings/lock", {
    body: { showId: showId2, seats: ["B4"] },
    token: user2Token,
  });
  check("Locking a different seat succeeds", differentSeat.status === 200);

  // ============================================================
  // 9. REVIEWS + RATING UPDATE
  // ============================================================
  console.log("\n--- Reviews + Rating Update ---");

  // Create a review
  const review1 = await request(server, "POST", `/api/movies/${movieId1}/reviews`, {
    body: { rating: 5, comment: "Masterpiece" },
    token: userToken,
  });
  check("Create review returns 201", review1.status === 201);

  // Second review from user2
  const review2 = await request(server, "POST", `/api/movies/${movieId1}/reviews`, {
    body: { rating: 3, comment: "Good but long" },
    token: user2Token,
  });
  check("Second review returns 201", review2.status === 201);

  // Verify rating summary updated on movie
  const movieAfterReview = await request(server, "GET", `/api/movies/${movieId1}`);
  const ratingAvg = movieAfterReview.body.data?.ratingAverage;
  const ratingCount = movieAfterReview.body.data?.ratingCount;
  check("Movie ratingAverage updated (4.0)", ratingAvg === 4);
  check("Movie ratingCount is 2", ratingCount === 2);

  // List reviews
  const reviewList = await request(server, "GET", `/api/movies/${movieId1}/reviews`);
  check("List reviews returns 200", reviewList.status === 200);
  check("List reviews has 2 items", reviewList.body.data?.length === 2);

  // Upsert review (update existing)
  const reviewUpdate = await request(server, "POST", `/api/movies/${movieId1}/reviews`, {
    body: { rating: 4, comment: "Updated - still great" },
    token: userToken,
  });
  check("Upsert review returns 201", reviewUpdate.status === 201);

  // Verify average changed
  const movieAfterUpsert = await request(server, "GET", `/api/movies/${movieId1}`);
  const newAvg = movieAfterUpsert.body.data?.ratingAverage;
  check("Rating average updated after upsert (3.5)", newAvg === 3.5);

  // Delete a review
  const reviewId = review2.body.data?.id || review2.body.data?._id;
  const delReview = await request(server, "DELETE", `/api/movies/${movieId1}/reviews/${reviewId}`, {
    token: user2Token,
  });
  check("Delete review returns 200", delReview.status === 200);

  // Verify rating updated
  const movieAfterDel = await request(server, "GET", `/api/movies/${movieId1}`);
  check("Rating count after delete is 1", movieAfterDel.body.data?.ratingCount === 1);

  // ============================================================
  // DONE
  // ============================================================
  console.log("\n--- Cleanup ---");
  server.close();
  await sequelize.close();

} catch (err) {
  console.error("\nVerification crashed:", err);
  fail += 1;
  if (server) server.close();
} finally {
  console.log(`\n========================================`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (failures.length > 0) {
    console.log(`\nFailed tests:`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(`========================================`);
  process.exit(fail === 0 ? 0 : 1);
}
