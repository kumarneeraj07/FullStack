import { Review } from "../models/Review.js";
import { Movie } from "../models/Movie.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, buildPaginationMeta } from "../utils/ApiResponse.js";

/**
 * Recompute and persist a movie's rating summary from its reviews.
 * Keeps the denormalized ratingAverage/ratingCount in sync.
 */
async function refreshMovieRating(movieId) {
  const [agg] = await Review.aggregate([
    { $match: { movie: movieId } },
    { $group: { _id: "$movie", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Movie.findByIdAndUpdate(movieId, {
    ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0,
    ratingCount: agg ? agg.count : 0,
  });
}

/** GET /api/movies/:movieId/reviews  (paginated) */
export const listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const filter = { movie: req.params.movieId };

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    data: items,
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

  const movie = await Movie.findById(movieId);
  if (!movie) throw ApiError.notFound("Movie not found");

  const review = await Review.findOneAndUpdate(
    { movie: movieId, user: req.user._id },
    { rating, comment },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await refreshMovieRating(movie._id);
  return sendSuccess(res, { statusCode: 201, message: "Review saved", data: review });
});

/** DELETE /api/movies/:movieId/reviews/:id */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");
  if (String(review.user) !== String(req.user._id) && req.user.role !== "admin") {
    throw ApiError.forbidden("You cannot delete this review");
  }
  await review.deleteOne();
  await refreshMovieRating(review.movie);
  return sendSuccess(res, { message: "Review deleted" });
});
