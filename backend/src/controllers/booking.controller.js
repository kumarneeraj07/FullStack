import { Booking, Show, Movie, Theatre } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import {
  lockSeats,
  confirmBooking,
  cancelBooking,
  releaseSeats,
} from "../services/booking.service.js";

/**
 * Helper to add _id alias to a plain object for backward compatibility.
 */
function addIdAlias(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return { ...obj, _id: obj.id };
}

/**
 * POST /api/bookings/lock
 * Step 1 of the booking workflow: temporarily hold the chosen seats.
 */
export const lock = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  const result = await lockSeats({ showId, userId: req.user.id, seats });
  return sendSuccess(res, {
    message: "Seats held. Complete payment before the hold expires.",
    data: result,
  });
});

/**
 * POST /api/bookings/confirm
 * Step 2: confirm the held seats and create the booking.
 */
export const confirm = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  const booking = await confirmBooking({ showId, userId: req.user.id, seats });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Booking confirmed",
    data: addIdAlias(booking.get ? booking.get({ plain: true }) : booking),
  });
});

/** POST /api/bookings/release -- give up a held seat selection */
export const release = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  await releaseSeats({ showId, userId: req.user.id, seats });
  return sendSuccess(res, { message: "Seat hold released" });
});

/** GET /api/bookings/me -- current user's bookings */
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: Show,
        attributes: ["id", "startTime", "format"],
        include: [
          { model: Movie, attributes: ["id", "title", "posterUrl"] },
          { model: Theatre, attributes: ["id", "name", "city"] },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const data = bookings.map((b) => {
    const plain = b.get({ plain: true });
    // Transform nested associations to match the frontend expected shape
    let show = null;
    if (plain.Show) {
      const movie = plain.Show.Movie ? { ...plain.Show.Movie, _id: plain.Show.Movie.id } : null;
      const theatre = plain.Show.Theatre ? { ...plain.Show.Theatre, _id: plain.Show.Theatre.id } : null;
      const { Movie: _m, Theatre: _t, ...showRest } = plain.Show;
      show = { ...showRest, _id: showRest.id, movie, theatre };
    }
    const { Show: _s, ...rest } = plain;
    return { ...rest, _id: rest.id, show };
  });

  return sendSuccess(res, { data });
});

/** DELETE /api/bookings/:id -- cancel a booking */
export const cancel = asyncHandler(async (req, res) => {
  const booking = await cancelBooking({
    bookingId: req.params.id,
    userId: req.user.id,
    isAdmin: req.user.role === "admin",
  });
  return sendSuccess(res, { message: "Booking cancelled", data: addIdAlias(booking.get ? booking.get({ plain: true }) : booking) });
});
