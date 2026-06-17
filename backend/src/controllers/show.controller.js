import { Op } from "sequelize";
import { Show, Movie, Theatre, Screen } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { buildSeatMap } from "../services/seat.service.js";

/**
 * Helper to add _id alias recursively on plain objects.
 */
function addIdAlias(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(addIdAlias);
  const result = { ...obj, _id: obj.id };
  return result;
}

/**
 * GET /api/shows?movie=&city=&date=
 * Lists upcoming shows, optionally filtered by movie / city / date.
 */
export const listShows = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.movie) where.movieId = req.query.movie;

  if (req.query.date) {
    const start = new Date(req.query.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.startTime = { [Op.gte]: start, [Op.lt]: end };
  } else {
    where.startTime = { [Op.gte]: new Date() };
  }

  const theatreWhere = {};
  if (req.query.city) theatreWhere.city = req.query.city;

  const shows = await Show.findAll({
    where,
    include: [
      { model: Movie, attributes: ["id", "title", "posterUrl", "durationMinutes"] },
      { model: Theatre, attributes: ["id", "name", "city"], where: req.query.city ? theatreWhere : undefined },
    ],
    order: [["startTime", "ASC"]],
  });

  const data = shows.map((s) => {
    const plain = s.get({ plain: true });
    const movie = plain.Movie ? { ...plain.Movie, _id: plain.Movie.id } : null;
    const theatre = plain.Theatre ? { ...plain.Theatre, _id: plain.Theatre.id } : null;
    const { Movie: _m, Theatre: _t, ...rest } = plain;
    return { ...rest, _id: rest.id, movie, theatre };
  });

  return sendSuccess(res, { data });
});

/** GET /api/shows/:id -- show details with a live seat map */
export const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findByPk(req.params.id, {
    include: [
      { model: Movie, attributes: ["id", "title", "posterUrl", "durationMinutes", "certification"] },
      { model: Theatre, attributes: ["id", "name", "city", "address"] },
    ],
  });
  if (!show) throw ApiError.notFound("Show not found");

  const seatMap = await buildSeatMap(show);
  const plain = show.get({ plain: true });

  const movie = plain.Movie ? { ...plain.Movie, _id: plain.Movie.id } : null;
  const theatre = plain.Theatre ? { ...plain.Theatre, _id: plain.Theatre.id } : null;
  const { Movie: _m, Theatre: _t, ...showData } = plain;

  return sendSuccess(res, {
    data: {
      ...showData,
      _id: showData.id,
      movie,
      theatre,
      seatLayout: seatMap.rows,
      screenName: seatMap.screenName,
    },
  });
});

/** POST /api/shows  (admin) */
export const createShow = asyncHandler(async (req, res) => {
  const { screen: screenId, screenId: altScreenId, movie: movieId, movieId: altMovieId } = req.body;
  const lookupScreenId = screenId || altScreenId;
  const lookupMovieId = movieId || altMovieId;

  const screen = await Screen.findByPk(lookupScreenId);
  if (!screen) throw ApiError.notFound("Screen not found");

  const show = await Show.create({
    movieId: lookupMovieId,
    screenId: screen.id,
    theatreId: screen.theatreId, // derive theatre from the screen to stay consistent
    startTime: req.body.startTime,
    format: req.body.format,
    language: req.body.language,
  });
  return sendSuccess(res, { statusCode: 201, message: "Show created", data: addIdAlias(show.get({ plain: true })) });
});

/** DELETE /api/shows/:id  (admin) */
export const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findByPk(req.params.id);
  if (!show) throw ApiError.notFound("Show not found");
  await show.destroy();
  return sendSuccess(res, { message: "Show deleted" });
});
