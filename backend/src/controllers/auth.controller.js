import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { signToken } from "../services/token.service.js";

const publicUser = (u) => ({
  id: u.id,
  _id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw ApiError.conflict("Email is already registered");

  // Only allow self-registration as a regular user; admins are seeded/promoted.
  const user = await User.create({ name, email, password, role: role === "admin" ? "user" : "user" });
  const token = signToken(user);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Registration successful",
    data: { user: publicUser(user), token },
  });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Use unscoped() to include the password field for comparison
  const user = await User.unscoped().findOne({ where: { email } });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken(user);
  return sendSuccess(res, {
    message: "Login successful",
    data: { user: publicUser(user), token },
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: { user: publicUser(req.user) } });
});
