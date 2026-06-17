import { Show } from "../models/Show.js";
import { Screen } from "../models/Screen.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { buildSeatMap } from "../services/seat.service.js";

/**
 * GET /api/shows?movie=&city=&date=
 * Lists upcoming shows, optionally filtered by movie / city / date.
 */
export const listShows = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.movie) filter.movie = req.query.movie;

  if (req.query.date) {
    const start = new Date(req.query.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.startTime = { $gte: start, $lt: end };
  } else {
    filter.startTime = { $gte: new Date() };
  }

  let query = Show.find(filter)
    .populate("movie", "title posterUrl durationMinutes")
    .populate("theatre", "name city")
    .sort("startTime")
    .lean();

  let shows = await query;
  if (req.query.city) {
    shows = shows.filter((s) => s.theatre?.city === req.query.city);
  }
  // Hide internal lock details from the list response.
  shows = shows.map(({ locks, ...rest }) => rest);
  return sendSuccess(res, { data: shows });
});

/** GET /api/shows/:id — show details with a live seat map */
export const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate("movie", "title posterUrl durationMinutes certification")
    .populate("theatre", "name city address");
  if (!show) throw ApiError.notFound("Show not found");

  const seatMap = await buildSeatMap(show);
  const { locks, ...showData } = show.toObject();

  return sendSuccess(res, {
    data: {
      ...showData,
      seatLayout: seatMap.rows,
      screenName: seatMap.screenName,
    },
  });
});

/** POST /api/shows  (admin) */
export const createShow = asyncHandler(async (req, res) => {
  const { screen: screenId } = req.body;
  const screen = await Screen.findById(screenId);
  if (!screen) throw ApiError.notFound("Screen not found");

  const show = await Show.create({
    ...req.body,
    theatre: screen.theatre, // derive theatre from the screen to stay consistent
  });
  return sendSuccess(res, { statusCode: 201, message: "Show created", data: show });
});

/** DELETE /api/shows/:id  (admin) */
export const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findByIdAndDelete(req.params.id);
  if (!show) throw ApiError.notFound("Show not found");
  return sendSuccess(res, { message: "Show deleted" });
});
