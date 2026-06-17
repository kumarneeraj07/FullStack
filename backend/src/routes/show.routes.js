import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  listShows,
  getShow,
  createShow,
  deleteShow,
} from "../controllers/show.controller.js";

const router = Router();

router.get("/", listShows);
router.get("/:id", getShow);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("movie").notEmpty().withMessage("movie id is required"),
    body("screen").notEmpty().withMessage("screen id is required"),
    body("startTime").isISO8601().withMessage("startTime must be a valid date"),
    body("language").trim().notEmpty().withMessage("language is required"),
  ],
  validate,
  createShow
);

router.delete("/:id", authenticate, authorize("admin"), deleteShow);

export default router;
