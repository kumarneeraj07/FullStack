import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  listTheatres,
  getTheatre,
  createTheatre,
  createScreen,
} from "../controllers/theatre.controller.js";

const router = Router();

router.get("/", listTheatres);
router.get("/:id", getTheatre);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("city").trim().notEmpty().withMessage("City is required"),
  ],
  validate,
  createTheatre
);

router.post(
  "/:id/screens",
  authenticate,
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Screen name is required"),
    body("rows").isArray({ min: 1 }).withMessage("At least one row is required"),
    body("rows.*.label").notEmpty().withMessage("Row label is required"),
    body("rows.*.seats").isInt({ min: 1 }).withMessage("Row seats must be a positive integer"),
    body("rows.*.price").isFloat({ min: 0 }).withMessage("Row price must be >= 0"),
  ],
  validate,
  createScreen
);

export default router;
