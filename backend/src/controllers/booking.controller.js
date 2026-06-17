import { Booking } from "../models/Booking.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import {
  lockSeats,
  confirmBooking,
  cancelBooking,
  releaseSeats,
} from "../services/booking.service.js";

/**
 * POST /api/bookings/lock
 * Step 1 of the booking workflow: temporarily hold the chosen seats.
 */
export const lock = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  const result = await lockSeats({ showId, userId: req.user._id, seats });
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
  const booking = await confirmBooking({ showId, userId: req.user._id, seats });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Booking confirmed",
    data: booking,
  });
});

/** POST /api/bookings/release — give up a held seat selection */
export const release = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  await releaseSeats({ showId, userId: req.user._id, seats });
  return sendSuccess(res, { message: "Seat hold released" });
});

/** GET /api/bookings/me — current user's bookings */
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate({
      path: "show",
      select: "movie theatre startTime format",
      populate: [
        { path: "movie", select: "title posterUrl" },
        { path: "theatre", select: "name city" },
      ],
    })
    .sort("-createdAt")
    .lean();
  return sendSuccess(res, { data: bookings });
});

/** DELETE /api/bookings/:id — cancel a booking */
export const cancel = asyncHandler(async (req, res) => {
  const booking = await cancelBooking({
    bookingId: req.params.id,
    userId: req.user._id,
    isAdmin: req.user.role === "admin",
  });
  return sendSuccess(res, { message: "Booking cancelled", data: booking });
});
