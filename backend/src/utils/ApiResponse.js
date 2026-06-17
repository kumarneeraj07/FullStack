/**
 * Standardized success response envelope so every endpoint returns
 * a predictable shape: { success, message, data, meta }.
 */
export function sendSuccess(res, { statusCode = 200, message = "OK", data = null, meta = null } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

/**
 * Helper to build pagination metadata consistently.
 */
export function buildPaginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export default sendSuccess;
