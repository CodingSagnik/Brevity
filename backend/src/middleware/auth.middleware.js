"use strict";

const { verifyToken } = require("../utils/jwt");

/**
 * ─── Token Extraction Helper ──────────────────────────────────────────────────
 *
 * The Authorization header must follow the RFC 6750 Bearer scheme:
 *   Authorization: Bearer <token>
 *
 * We extract only the token part and return null for any malformed value,
 * so middleware can handle the absence cleanly.
 *
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim(); // "Bearer ".length === 7
  return token || null;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
//
// STRICT guard — for routes that only registered users may access.
// Returns 401 if no token is present or the token is invalid/expired.
// Attaches the decoded userId to req.userId on success so downstream
// controllers never need to touch the JWT again.
//
// Usage:
//   router.get("/my-links", requireAuth, myLinksController);

const requireAuth = (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Provide a Bearer token in the Authorization header.",
    });
  }

  try {
    const payload = verifyToken(token);
    // Attach the user's MongoDB ObjectId string to the request.
    // Downstream code uses req.userId — it never needs to re-decode the token.
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    // jwt.JsonWebTokenError  → malformed token (tampered, wrong secret)
    // jwt.TokenExpiredError  → valid token that has passed its `exp` claim
    // Both are the client's problem and map to 401, not 500.
    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token. Please log in again.";

    return res.status(401).json({ error: message });
  }
};

// ─── optionalAuth ─────────────────────────────────────────────────────────────
//
// PERMISSIVE guard — for routes that work for both anonymous and registered users.
//
// Decision table:
//   No Authorization header          → req.userId = undefined  → next()  (anonymous)
//   Valid Bearer token                → req.userId = "<id>"     → next()  (authenticated)
//   Authorization header + bad token → 401                              (explicit fail)
//
// The third case is intentional. If a client sends an Authorization header, it
// intends to be authenticated. Silently downgrading a bad token to anonymous
// would be confusing and could mask bugs in client code.
//
// Usage:
//   router.post("/shorten", optionalAuth, shortenController);

const optionalAuth = (req, res, next) => {
  const token = extractBearerToken(req);

  // No header at all — treat as anonymous, continue without userId
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token. Please log in again.";

    return res.status(401).json({ error: message });
  }
};

module.exports = { requireAuth, optionalAuth };
