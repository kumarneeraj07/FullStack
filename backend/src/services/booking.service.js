import crypto from "crypto";
import { Op, UniqueConstraintError, literal } from "sequelize";
import { sequelize } from "../config/db.js";
import { Show, Booking, SeatLock } from "../models/index.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { priceSeats } from "./seat.service.js";

const dialect = sequelize.getDialect();

/**
 * Remove expired locks from the SeatLock table for a given show.
 */
async function releaseExpiredLocks(showId, now = new Date(), transaction = null) {
  const opts = transaction ? { transaction } : {};
  await SeatLock.destroy({
    where: {
      showId,
      expiresAt: { [Op.lte]: now },
    },
    ...opts,
  });
}

/**
 * STEP 1 -- Lock seats while the user checks out.
 *
 * Concurrency safety: we use PostgreSQL's unique constraint on (showId, seat)
 * in the seat_locks table. If two users try to lock the same seat, the second
 * INSERT will violate the constraint and get a 409 Conflict.
 */
export async function lockSeats({ showId, userId, seats }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.seatLockTtlSeconds * 1000);

  return sequelize.transaction(async (transaction) => {
    // First, delete any expired locks for this show
    await releaseExpiredLocks(showId, now, transaction);

    // Verify the show exists
    const show = await Show.findByPk(showId, { transaction });
    if (!show) throw ApiError.notFound("Show not found");

    // Check that none of the requested seats are already booked
    const bookedSeats = show.bookedSeats || [];
    const alreadyBooked = seats.filter((s) => bookedSeats.includes(s));
    if (alreadyBooked.length > 0) {
      throw ApiError.conflict("One or more selected seats are no longer available");
    }

    // Attempt to insert locks. The unique constraint on (showId, seat)
    // prevents double-locking at the database level.
    const lockRecords = seats.map((seat) => ({
      showId,
      userId,
      seat,
      expiresAt,
    }));

    try {
      await SeatLock.bulkCreate(lockRecords, { transaction });
    } catch (err) {
      if (err instanceof UniqueConstraintError || err.name === "SequelizeUniqueConstraintError") {
        throw ApiError.conflict("One or more selected seats are no longer available");
      }
      throw err;
    }

    return { showId, seats, expiresAt };
  });
}

/**
 * STEP 2 -- Confirm the booking.
 *
 * Uses SELECT FOR UPDATE on the SeatLock rows to prevent race conditions.
 * Verifies the seats are still locked by THIS user, then atomically moves
 * them from locks into bookedSeats. Uses a transaction so the Show update
 * and the Booking are committed together (or not at all).
 */
export async function confirmBooking({ showId, userId, seats }) {
  return sequelize.transaction(async (transaction) => {
    const now = new Date();

    // Delete expired locks first
    await releaseExpiredLocks(showId, now, transaction);

    // SELECT FOR UPDATE on the user's locks to prevent concurrent modifications
    const myLocks = await SeatLock.findAll({
      where: {
        showId,
        userId,
        seat: { [Op.in]: seats },
        expiresAt: { [Op.gt]: now },
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const lockedSeats = new Set(myLocks.map((l) => l.seat));
    const allLocked = seats.every((s) => lockedSeats.has(s));
    if (!allLocked) {
      throw ApiError.conflict("Your seat hold has expired. Please select seats again.");
    }

    // Get the show with a lock
    const show = await Show.findByPk(showId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!show) throw ApiError.notFound("Show not found");

    // Double-check none of the seats were booked in between
    const currentBooked = show.bookedSeats || [];
    const conflict = seats.filter((s) => currentBooked.includes(s));
    if (conflict.length > 0) {
      throw ApiError.conflict("Seats were booked by someone else. Please try again.");
    }

    // Calculate total amount
    const { totalAmount } = await priceSeats(show, seats);
    const reference = `BK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Append seats to bookedSeats atomically
    if (dialect === "postgres") {
      // Use SQL-level array_cat for atomic append without read-modify-write
      const seatsLiteral = seats.map((s) => `'${s.replace(/'/g, "''")}'`).join(",");
      await Show.update(
        {
          bookedSeats: literal(`array_cat("bookedSeats", ARRAY[${seatsLiteral}]::varchar[])`),
        },
        { where: { id: showId }, transaction }
      );
    } else {
      // SQLite fallback: read-modify-write (safe here because row is locked via transaction)
      const updatedBookedSeats = [...currentBooked, ...seats];
      await show.update({ bookedSeats: updatedBookedSeats }, { transaction });
    }

    // Delete the locks
    await SeatLock.destroy({
      where: {
        showId,
        seat: { [Op.in]: seats },
      },
      transaction,
    });

    // Create the booking
    const booking = await Booking.create(
      {
        userId,
        showId,
        seats,
        totalAmount,
        reference,
        status: "confirmed",
      },
      { transaction }
    );

    return booking;
  });
}

/**
 * Cancel a confirmed booking and free its seats.
 */
export async function cancelBooking({ bookingId, userId, isAdmin }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.userId !== userId && !isAdmin) {
    throw ApiError.forbidden("You cannot cancel this booking");
  }
  if (booking.status === "cancelled") {
    throw ApiError.badRequest("Booking is already cancelled");
  }

  await sequelize.transaction(async (transaction) => {
    // Update booking status
    await booking.update({ status: "cancelled" }, { transaction });

    // Remove seats from show's bookedSeats
    if (dialect === "postgres") {
      // Use SQL-level array_remove for atomic removal without read-modify-write
      let expr = '"bookedSeats"';
      for (const seat of booking.seats) {
        expr = `array_remove(${expr}, '${seat.replace(/'/g, "''")}')`;
      }
      await Show.update(
        { bookedSeats: literal(expr) },
        { where: { id: booking.showId }, transaction }
      );
    } else {
      // SQLite fallback: read-modify-write
      const show = await Show.findByPk(booking.showId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (show) {
        const updatedSeats = (show.bookedSeats || []).filter(
          (s) => !booking.seats.includes(s)
        );
        await show.update({ bookedSeats: updatedSeats }, { transaction });
      }
    }
  });

  return booking;
}

/**
 * Release a user's own locks (e.g. they navigated away from checkout).
 */
export async function releaseSeats({ showId, userId, seats }) {
  await SeatLock.destroy({
    where: {
      showId,
      userId,
      seat: { [Op.in]: seats },
    },
  });
}
