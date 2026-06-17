import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/movie.controller.js";
import {
  listReviews,
  upsertReview,
  deleteReview,
} from "../controllers/review.controller.js";

const router = Router();

// ---- Movies (public reads, admin writes) ----
router.get("/", listMovies);
router.get("/:id", getMovie);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("language").trim().notEmpty().withMessage("Language is required"),
    body("durationMinutes").isInt({ min: 1 }).withMessage("Duration must be a positive integer"),
  ],
  validate,
  createMovie
);

router.put("/:id", authenticate, authorize("admin"), updateMovie);
router.delete("/:id", authenticate, authorize("admin"), deleteMovie);

// ---- Reviews nested under a movie ----
router.get("/:movieId/reviews", listReviews);
router.post(
  "/:movieId/reviews",
  authenticate,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").optional().isLength({ max: 1000 }),
  ],
  validate,
  upsertReview
);
router.delete("/:movieId/reviews/:id", authenticate, deleteReview);

export default router;
