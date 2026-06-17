import { Movie } from "../models/Movie.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, buildPaginationMeta } from "../utils/ApiResponse.js";

/**
 * GET /api/movies
 * Supports: ?search=, ?language=, ?genre=, ?page=, ?limit=, ?sort=
 * Demonstrates search + pagination + sorting.
 */
export const listMovies = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) filter.$text = { $search: req.query.search };
  if (req.query.language) filter.language = req.query.language;
  if (req.query.genre) filter.genres = req.query.genre;

  // Sort: e.g. "ratingAverage" (asc) or "-releaseDate" (desc). Default newest.
  const sort = req.query.sort || "-createdAt";

  const [items, total] = await Promise.all([
    Movie.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Movie.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    data: items,
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

/** GET /api/movies/:id */
export const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) throw ApiError.notFound("Movie not found");
  return sendSuccess(res, { data: movie });
});

/** POST /api/movies  (admin) */
export const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Movie created", data: movie });
});

/** PUT /api/movies/:id  (admin) */
export const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!movie) throw ApiError.notFound("Movie not found");
  return sendSuccess(res, { message: "Movie updated", data: movie });
});

/** DELETE /api/movies/:id  (admin) */
export const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);
  if (!movie) throw ApiError.notFound("Movie not found");
  return sendSuccess(res, { message: "Movie deleted" });
});
