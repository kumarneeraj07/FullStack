/**
 * Verification script for the PostgreSQL/Sequelize migration.
 *
 * Since no live PostgreSQL server is available in the sandbox environment,
 * this script validates:
 *  - All imports resolve correctly (no lingering mongoose dependencies)
 *  - All controllers, services, and middleware export the expected functions
 *  - No references to mongoose exist in the source code
 *
 * For full integration testing with a real PostgreSQL database, use
 * docker-compose or a local PostgreSQL instance.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

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

try {
  // 1. Validate all modules import cleanly
  console.log("--- Import validation ---");

  const app = await import("../src/app.js");
  check("app.js imports", typeof app.createApp === "function");

  const models = await import("../src/models/index.js");
  check("models/index.js exports User", typeof models.User === "function");
  check("models/index.js exports Movie", typeof models.Movie === "function");
  check("models/index.js exports Theatre", typeof models.Theatre === "function");
  check("models/index.js exports Screen", typeof models.Screen === "function");
  check("models/index.js exports Show", typeof models.Show === "function");
  check("models/index.js exports Booking", typeof models.Booking === "function");
  check("models/index.js exports Review", typeof models.Review === "function");
  check("models/index.js exports SeatLock", typeof models.SeatLock === "function");

  const authMiddleware = await import("../src/middleware/auth.js");
  check("auth middleware exports authenticate", typeof authMiddleware.authenticate === "function");
  check("auth middleware exports authorize", typeof authMiddleware.authorize === "function");

  const errorHandler = await import("../src/middleware/errorHandler.js");
  check("errorHandler exports notFoundHandler", typeof errorHandler.notFoundHandler === "function");
  check("errorHandler exports errorHandler", typeof errorHandler.errorHandler === "function");

  const tokenService = await import("../src/services/token.service.js");
  check("token.service exports signToken", typeof tokenService.signToken === "function");

  const withTransaction = await import("../src/utils/withTransaction.js");
  check("withTransaction exports function", typeof withTransaction.withTransaction === "function");

  const bookingService = await import("../src/services/booking.service.js");
  check("booking.service exports lockSeats", typeof bookingService.lockSeats === "function");
  check("booking.service exports confirmBooking", typeof bookingService.confirmBooking === "function");
  check("booking.service exports cancelBooking", typeof bookingService.cancelBooking === "function");
  check("booking.service exports releaseSeats", typeof bookingService.releaseSeats === "function");

  const seatService = await import("../src/services/seat.service.js");
  check("seat.service exports buildSeatMap", typeof seatService.buildSeatMap === "function");
  check("seat.service exports priceSeats", typeof seatService.priceSeats === "function");

  const authCtrl = await import("../src/controllers/auth.controller.js");
  check("auth.controller exports register", typeof authCtrl.register === "function");
  check("auth.controller exports login", typeof authCtrl.login === "function");
  check("auth.controller exports me", typeof authCtrl.me === "function");

  const movieCtrl = await import("../src/controllers/movie.controller.js");
  check("movie.controller exports listMovies", typeof movieCtrl.listMovies === "function");
  check("movie.controller exports getMovie", typeof movieCtrl.getMovie === "function");
  check("movie.controller exports createMovie", typeof movieCtrl.createMovie === "function");
  check("movie.controller exports updateMovie", typeof movieCtrl.updateMovie === "function");
  check("movie.controller exports deleteMovie", typeof movieCtrl.deleteMovie === "function");

  const theatreCtrl = await import("../src/controllers/theatre.controller.js");
  check("theatre.controller exports listTheatres", typeof theatreCtrl.listTheatres === "function");
  check("theatre.controller exports getTheatre", typeof theatreCtrl.getTheatre === "function");
  check("theatre.controller exports createTheatre", typeof theatreCtrl.createTheatre === "function");
  check("theatre.controller exports createScreen", typeof theatreCtrl.createScreen === "function");

  const showCtrl = await import("../src/controllers/show.controller.js");
  check("show.controller exports listShows", typeof showCtrl.listShows === "function");
  check("show.controller exports getShow", typeof showCtrl.getShow === "function");
  check("show.controller exports createShow", typeof showCtrl.createShow === "function");
  check("show.controller exports deleteShow", typeof showCtrl.deleteShow === "function");

  const reviewCtrl = await import("../src/controllers/review.controller.js");
  check("review.controller exports listReviews", typeof reviewCtrl.listReviews === "function");
  check("review.controller exports upsertReview", typeof reviewCtrl.upsertReview === "function");
  check("review.controller exports deleteReview", typeof reviewCtrl.deleteReview === "function");

  const bookingCtrl = await import("../src/controllers/booking.controller.js");
  check("booking.controller exports lock", typeof bookingCtrl.lock === "function");
  check("booking.controller exports confirm", typeof bookingCtrl.confirm === "function");
  check("booking.controller exports release", typeof bookingCtrl.release === "function");
  check("booking.controller exports myBookings", typeof bookingCtrl.myBookings === "function");
  check("booking.controller exports cancel", typeof bookingCtrl.cancel === "function");

  // 2. Check for mongoose references in src/
  console.log("\n--- No mongoose references ---");
  try {
    const result = execSync(`grep -r 'mongoose' "${srcDir}"`, { encoding: "utf-8" });
    check("no mongoose references in src/", false);
    console.log("    Found:", result.trim());
  } catch {
    // grep returns exit code 1 when no matches found - that is the expected outcome
    check("no mongoose references in src/", true);
  }

  // 3. Check Sequelize model structure
  console.log("\n--- Model structure ---");
  const { User } = models;
  check("User has comparePassword method", typeof User.prototype.comparePassword === "function");
  check("User.findByPk is available", typeof User.findByPk === "function");
  check("User.findOne is available", typeof User.findOne === "function");

  const { sequelize } = await import("../src/config/db.js");
  check("sequelize instance exported from db.js", sequelize && typeof sequelize.transaction === "function");

} catch (err) {
  console.error("Verification crashed:", err);
  fail += 1;
} finally {
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
