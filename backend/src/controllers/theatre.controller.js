import { Theatre } from "../models/Theatre.js";
import { Screen } from "../models/Screen.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/theatres?city= */
export const listTheatres = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter.city = req.query.city;
  const theatres = await Theatre.find(filter).sort("name").lean();
  return sendSuccess(res, { data: theatres });
});

/** GET /api/theatres/:id  (includes its screens) */
export const getTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id).lean();
  if (!theatre) throw ApiError.notFound("Theatre not found");
  const screens = await Screen.find({ theatre: theatre._id }).lean();
  return sendSuccess(res, { data: { ...theatre, screens } });
});

/** POST /api/theatres  (admin) */
export const createTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.create(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Theatre created", data: theatre });
});

/** POST /api/theatres/:id/screens  (admin) — define a screen + seat layout */
export const createScreen = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw ApiError.notFound("Theatre not found");
  const screen = await Screen.create({ ...req.body, theatre: theatre._id });
  return sendSuccess(res, { statusCode: 201, message: "Screen created", data: screen });
});
