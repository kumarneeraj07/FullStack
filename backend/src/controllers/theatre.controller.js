import { Theatre, Screen } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * Helper to add _id alias to a plain object for backward compatibility.
 */
function addIdAlias(obj) {
  if (!obj) return obj;
  return { ...obj, _id: obj.id };
}

/** GET /api/theatres?city= */
export const listTheatres = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.city) where.city = req.query.city;

  const theatres = await Theatre.findAll({
    where,
    order: [["name", "ASC"]],
  });

  const data = theatres.map((t) => addIdAlias(t.get({ plain: true })));
  return sendSuccess(res, { data });
});

/** GET /api/theatres/:id  (includes its screens) */
export const getTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findByPk(req.params.id, {
    include: [{ model: Screen }],
  });
  if (!theatre) throw ApiError.notFound("Theatre not found");

  const plain = theatre.get({ plain: true });
  const screens = (plain.Screens || []).map(addIdAlias);
  const data = { ...addIdAlias(plain), screens };
  delete data.Screens;

  return sendSuccess(res, { data });
});

/** POST /api/theatres  (admin) */
export const createTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.create(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Theatre created", data: addIdAlias(theatre.get({ plain: true })) });
});

/** POST /api/theatres/:id/screens  (admin) -- define a screen + seat layout */
export const createScreen = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findByPk(req.params.id);
  if (!theatre) throw ApiError.notFound("Theatre not found");
  const screen = await Screen.create({ ...req.body, theatreId: theatre.id });
  return sendSuccess(res, { statusCode: 201, message: "Screen created", data: addIdAlias(screen.get({ plain: true })) });
});
