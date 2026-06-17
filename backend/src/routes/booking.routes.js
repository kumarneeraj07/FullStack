import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  lock,
  confirm,
  release,
  myBookings,
  cancel,
} from "../controllers/booking.controller.js";

const router = Router();

// All booking routes require authentication.
router.use(authenticate);

const seatSelectionRules = [
  body("showId").notEmpty().withMessage("showId is required"),
  body("seats").isArray({ min: 1 }).withMessage("Select at least one seat"),
  body("seats.*").isString().withMessage("Seat ids must be strings"),
];

router.post("/lock", seatSelectionRules, validate, lock);
router.post("/confirm", seatSelectionRules, validate, confirm);
router.post("/release", seatSelectionRules, validate, release);
router.get("/me", myBookings);
router.delete("/:id", cancel);

export default router;
