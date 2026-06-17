import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import { Movie } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, buildPaginationMeta } from "../utils/ApiResponse.js";

/**
 * Helper to add _id alias to a plain object for backward compatibility.
 */
function addIdAlias(obj) {
  if (!obj) return obj;
  return { ...obj, _id: obj.id };
}

/**
 * GET /api/movies
 * Supports: ?search=, ?language=, ?genre=, ?page=, ?limit=, ?sort=
 */
export const listMovies = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = {};
  if (req.query.search) {
    // SQLite does not support ILIKE; use Op.like (case-insensitive by default in SQLite)
    const likeOp = sequelize.getDialect() === "sqlite" ? Op.like : Op.iLike;
    where.title = { [likeOp]: `%${req.query.search}%` };
  }
  if (req.query.language) {
    where.language = req.query.language;
  }
  if (req.query.genre) {
    // Op.contains is PostgreSQL-only (for ARRAY columns). For SQLite use LIKE on the JSON text.
    if (sequelize.getDialect() === "sqlite") {
      where.genres = { [Op.like]: `%${req.query.genre}%` };
    } else {
      where.genres = { [Op.contains]: [req.query.genre] };
    }
  }

  // Sort: e.g. "ratingAverage" (asc) or "-releaseDate" (desc). Default newest.
  const sortParam = req.query.sort || "-createdAt";
  const order = [];
  for (const part of sortParam.split(",")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("-")) {
      order.push([trimmed.slice(1), "DESC"]);
    } else {
      order.push([trimmed, "ASC"]);
    }
  }

  const { rows: items, count: total } = await Movie.findAndCountAll({
    where,
    order,
    offset,
    limit,
  });

  const data = items.map((m) => addIdAlias(m.get({ plain: true })));

  return sendSuccess(res, {
    data,
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

/** GET /api/movies/:id */
export const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByPk(req.params.id);
  if (!movie) throw ApiError.notFound("Movie not found");
  return sendSuccess(res, { data: addIdAlias(movie.get({ plain: true })) });
});

/** POST /api/movies  (admin) */
export const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Movie created", data: addIdAlias(movie.get({ plain: true })) });
});

/** PUT /api/movies/:id  (admin) */
export const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByPk(req.params.id);
  if (!movie) throw ApiError.notFound("Movie not found");
  await movie.update(req.body);
  return sendSuccess(res, { message: "Movie updated", data: addIdAlias(movie.get({ plain: true })) });
});

/** DELETE /api/movies/:id  (admin) */
export const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByPk(req.params.id);
  if (!movie) throw ApiError.notFound("Movie not found");
  await movie.destroy();
  return sendSuccess(res, { message: "Movie deleted" });
});
