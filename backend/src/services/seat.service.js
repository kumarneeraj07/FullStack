import { Op } from "sequelize";
import { Screen, SeatLock } from "../models/index.js";

/**
 * Build the seat layout for a show by combining the screen's physical
 * layout with the show's current booked/locked state.
 *
 * Returns an array of rows, each row containing seat objects:
 *   { id: "A1", status: "available" | "booked" | "locked", price, seatType }
 *
 * `now` lets callers treat expired locks as released.
 */
export async function buildSeatMap(show, now = new Date()) {
  const screen = await Screen.findByPk(show.screenId);
  if (!screen) return { rows: [], screenName: null };

  const booked = new Set(show.bookedSeats || []);

  // Load active locks from the SeatLock table
  const locks = await SeatLock.findAll({
    where: {
      showId: show.id,
      expiresAt: { [Op.gt]: now },
    },
    attributes: ["seat"],
  });
  const lockedSeats = new Set(locks.map((l) => l.seat));

  const rows = screen.rows.map((row) => {
    const seats = [];
    for (let i = 1; i <= row.seats; i += 1) {
      const id = `${row.label}${i}`;
      let status = "available";
      if (booked.has(id)) status = "booked";
      else if (lockedSeats.has(id)) status = "locked";
      seats.push({ id, status, price: row.price, seatType: row.seatType });
    }
    return { label: row.label, seatType: row.seatType, price: row.price, seats };
  });

  return { rows, screenName: screen.name };
}

/**
 * Compute the price for a list of seat ids using the screen's row pricing.
 * Returns { totalAmount, breakdown } and throws if a seat id is unknown.
 */
export async function priceSeats(show, seatIds) {
  const screen = await Screen.findByPk(show.screenId);
  if (!screen) throw new Error("Screen not found for show");

  // Map of rowLabel -> price derived from the row configuration.
  const priceByRow = new Map(screen.rows.map((r) => [r.label, r.price]));
  let totalAmount = 0;
  const breakdown = [];
  for (const seatId of seatIds) {
    const rowLabel = seatId.replace(/\d+$/, "");
    const price = priceByRow.get(rowLabel);
    if (price == null) throw new Error(`Unknown seat: ${seatId}`);
    totalAmount += price;
    breakdown.push({ seat: seatId, price });
  }
  return { totalAmount, breakdown };
}
