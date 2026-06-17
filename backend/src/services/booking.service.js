import crypto from "crypto";
import { Show } from "../models/Show.js";
import { Booking } from "../models/Booking.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { withTransaction } from "../utils/withTransaction.js";
import { priceSeats } from "./seat.service.js";

/**
 * Remove expired locks from a show so the seats become available again.
 * Single-document update — atomic at the document level in MongoDB.
 */
async function releaseExpiredLocks(showId, now = new Date()) {
  await Show.updateOne({ _id: showId }, { $pull: { locks: { expiresAt: { $lte: now } } } });
}

/**
 * STEP 1 — Lock seats while the user checks out.
 *
 * Concurrency safety: we use a single conditional findOneAndUpdate. The
 * filter requires that NONE of the requested seats are already booked or
 * actively locked. Because a single-document update in MongoDB is atomic,
 * two concurrent requests for the same seat can never both succeed — the
 * second one fails the filter and gets a 409. This is what prevents
 * double booking.
 */
export async function lockSeats({ showId, userId, seats }) {
  const now = new Date();
  await releaseExpiredLocks(showId, now);

  const expiresAt = new Date(now.getTime() + env.seatLockTtlSeconds * 1000);
  const lockDocs = seats.map((seat) => ({ seat, user: userId, expiresAt }));

  const updated = await Show.findOneAndUpdate(
    {
      _id: showId,
      bookedSeats: { $nin: seats },
      "locks.seat": { $nin: seats },
    },
    { $push: { locks: { $each: lockDocs } } },
    { new: true }
  );

  if (!updated) {
    // Either the show doesn't exist or one of the seats is taken/locked.
    const exists = await Show.exists({ _id: showId });
    if (!exists) throw ApiError.notFound("Show not found");
    throw ApiError.conflict("One or more selected seats are no longer available");
  }

  return { showId, seats, expiresAt };
}

/**
 * STEP 2 — Confirm the booking.
 *
 * Verifies the seats are still locked by THIS user, then atomically moves
 * them from `locks` into `bookedSeats`. Uses a transaction so the Show
 * update and the Booking document are committed together (or not at all).
 */
export async function confirmBooking({ showId, userId, seats }) {
  const now = new Date();
  await releaseExpiredLocks(showId, now);

  const show = await Show.findById(showId);
  if (!show) throw ApiError.notFound("Show not found");

  // Every requested seat must currently be locked by this user.
  const myLocks = new Set(
    show.locks
      .filter((l) => String(l.user) === String(userId) && l.expiresAt > now)
      .map((l) => l.seat)
  );
  const allLocked = seats.every((s) => myLocks.has(s));
  if (!allLocked) {
    throw ApiError.conflict("Your seat hold has expired. Please select seats again.");
  }

  const { totalAmount } = await priceSeats(show, seats);
  const reference = `BK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  const booking = await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    // Atomically move seats: only succeeds if none are already booked.
    const res = await Show.updateOne(
      { _id: showId, bookedSeats: { $nin: seats } },
      {
        $addToSet: { bookedSeats: { $each: seats } },
        $pull: { locks: { seat: { $in: seats } } },
      },
      opts
    );
    if (res.modifiedCount === 0) {
      throw ApiError.conflict("Seats were booked by someone else. Please try again.");
    }

    const created = await Booking.create(
      [
        {
          user: userId,
          show: showId,
          seats,
          totalAmount,
          reference,
          status: "confirmed",
        },
      ],
      opts
    );
    return created[0];
  });

  return booking;
}

/**
 * Cancel a confirmed booking and free its seats.
 */
export async function cancelBooking({ bookingId, userId, isAdmin }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound("Booking not found");
  if (String(booking.user) !== String(userId) && !isAdmin) {
    throw ApiError.forbidden("You cannot cancel this booking");
  }
  if (booking.status === "cancelled") {
    throw ApiError.badRequest("Booking is already cancelled");
  }

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    booking.status = "cancelled";
    await booking.save(opts);
    await Show.updateOne(
      { _id: booking.show },
      { $pull: { bookedSeats: { $in: booking.seats } } },
      opts
    );
  });
  return booking;
}

/**
 * Release a user's own locks (e.g. they navigated away from checkout).
 */
export async function releaseSeats({ showId, userId, seats }) {
  await Show.updateOne(
    { _id: showId },
    { $pull: { locks: { seat: { $in: seats }, user: userId } } }
  );
}
