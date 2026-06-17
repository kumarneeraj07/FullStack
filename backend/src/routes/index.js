import { Router } from "express";
import authRoutes from "./auth.routes.js";
import movieRoutes from "./movie.routes.js";
import theatreRoutes from "./theatre.routes.js";
import showRoutes from "./show.routes.js";
import bookingRoutes from "./booking.routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ success: true, message: "API is healthy" }));

router.use("/auth", authRoutes);
router.use("/movies", movieRoutes);
router.use("/theatres", theatreRoutes);
router.use("/shows", showRoutes);
router.use("/bookings", bookingRoutes);

export default router;
