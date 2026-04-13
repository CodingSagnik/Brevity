"use strict";

/**
 * ─── JWT Utility ──────────────────────────────────────────────────────────────
 *
 * Centralising sign/verify logic here means:
 *  • The secret and options are defined in exactly one place.
 *  • The auth controller and middleware import these helpers — neither needs to
 *    know the raw `jsonwebtoken` API or remember to pass the right options.
 *  • If we later rotate to RS256 (asymmetric keys) for microservices, only this
 *    file changes.
 *
 * JWT STRUCTURE RECAP (for the presentation)
 * ───────────────────────────────────────────
 * A JWT is three Base64URL-encoded JSON objects joined by dots:
 *
 *   HEADER.PAYLOAD.SIGNATURE
 *
 * • Header  — algorithm and token type  { "alg": "HS256", "typ": "JWT" }
 * • Payload — the claims we embed        { "sub": "<userId>", "iat": …, "exp": … }
 * • Signature — HMAC-SHA256(header + "." + payload, JWT_SECRET)
 *
 * The server trusts the payload only because it can re-compute and verify the
 * signature using the shared secret. Tampering with the payload invalidates the
 * signature, so the token is rejected.
 *
 * STATELESS AUTHENTICATION
 * ────────────────────────
 * The server stores no session data. Every protected request carries its own
 * proof of identity inside the token. This scales horizontally — any backend
 * instance can verify any token using the shared secret, without a central
 * session store.
 *
 * The trade-off: tokens cannot be individually invalidated before they expire.
 * Mitigation strategies (out of scope for this MVP): short expiry + refresh
 * tokens, or a Redis token-blacklist on logout.
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.error("[JWT] JWT_SECRET is not defined. Set it in your .env file.");
  process.exit(1);
}

/**
 * Signs a new JWT for the given user.
 *
 * Payload uses the IANA-registered "sub" (subject) claim for the user ID —
 * a widely understood convention that avoids custom claim name collisions.
 *
 * @param {{ id: string, email: string }} user
 * @returns {string} signed JWT
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws a JsonWebTokenError or TokenExpiredError on failure —
 * callers should catch and convert to appropriate HTTP responses.
 *
 * @param {string} token
 * @returns {{ sub: string, email: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
