import { Sequelize } from "sequelize";
import { Review, Movie, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, buildPaginationMeta } from "../utils/ApiResponse.js";

/**
 * Helper to add _id alias to a plain object for backward compatibility.
 */
function addIdAlias(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return { ...obj, _id: obj.id };
}

/**
 * Recompute and persist a movie's rating summary from its reviews.
 * Keeps the denormalized ratingAverage/ratingCount in sync.
 */
async function refreshMovieRating(movieId) {
  const result = await Review.findOne({
    where: { movieId },
    attributes: [
      [Sequelize.fn("AVG", Sequelize.col("rating")), "avg"],
      [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
    ],
    raw: true,
  });

  const avg = result && result.avg ? Math.round(parseFloat(result.avg) * 10) / 10 : 0;
  const count = result && result.count ? parseInt(result.count, 10) : 0;

  await Movie.update(
    { ratingAverage: avg, ratingCount: count },
    { where: { id: movieId } }
  );
}

/** GET /api/movies/:movieId/reviews  (paginated) */
export const listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const where = { movieId: req.params.movieId };

  const { rows: items, count: total } = await Review.findAndCountAll({
    where,
    include: [{ model: User, attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
    offset,
    limit,
  });

  const data = items.map((r) => {
    const plain = r.get({ plain: true });
    const user = plain.User ? { ...plain.User, _id: plain.User.id } : null;
    const { User: _u, ...rest } = plain;
    return { ...rest, _id: rest.id, user };
  });

  return sendSuccess(res, {
    data,
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

/**
 * POST /api/movies/:movieId/reviews
 * Create or update the current user's review (upsert), then refresh summary.
 */
export const upsertReview = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const { rating, comment } = req.body;

  const movie = await Movie.findByPk(movieId);
  if (!movie) throw ApiError.notFound("Movie not found");

  // Sequelize upsert: returns [instance, created]
  const [review] = await Review.upsert(
    { movieId, userId: req.user.id, rating, comment: comment || "" },
    { returning: true }
  );

  await refreshMovieRating(movieId);
  return sendSuccess(res, { statusCode: 201, message: "Review saved", data: addIdAlias(review.get({ plain: true })) });
});

/** DELETE /api/movies/:movieId/reviews/:id */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByPk(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");
  if (review.userId !== req.user.id && req.user.role !== "admin") {
    throw ApiError.forbidden("You cannot delete this review");
  }
  const movieId = review.movieId;
  await review.destroy();
  await refreshMovieRating(movieId);
  return sendSuccess(res, { message: "Review deleted" });
});
