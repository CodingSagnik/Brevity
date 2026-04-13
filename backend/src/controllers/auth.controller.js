"use strict";

const User = require("../models/User");
const { signToken } = require("../utils/jwt");

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * Creates a new user account.
 *
 * Password hashing is handled entirely by the User model's pre-save hook —
 * this controller never touches bcrypt directly, keeping concerns separate.
 *
 * Security notes:
 * • We return the same generic 409 for a duplicate email instead of leaking
 *   which emails are already registered (user enumeration attack prevention).
 * • The JWT is issued immediately on registration so the client is logged in
 *   without a second round-trip — standard UX for sign-up flows.
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }

    const user = await User.create({ email, password });

    const token = signToken({ id: user.id, email: user.email });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    // MongoDB duplicate key on the unique email index
    if (err.code === 11000) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    // Mongoose validation error (e.g. invalid email format, password too short)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(422).json({ error: messages.join(" ") });
    }
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * Authenticates an existing user and returns a JWT.
 *
 * GENERIC ERROR MESSAGE
 * ─────────────────────
 * Both "user not found" and "wrong password" return the same 401 response:
 * "Invalid email or password." This is deliberate — giving different messages
 * for each case would allow an attacker to enumerate valid email addresses by
 * probing the API (user-enumeration attack).
 *
 * TIMING CONSISTENCY
 * ──────────────────
 * Even when the user is not found, we still call bcrypt.compare() against a
 * dummy value. Without this, the login endpoint would respond faster for
 * non-existent emails (no bcrypt work needed) than for wrong passwords (full
 * bcrypt work), leaking valid email addresses through response-time analysis.
 */

// A static hash computed at startup — used to normalize timing for unknown emails.
// We compute it once so it doesn't add startup time on every login attempt.
let _dummyHash = null;
const bcrypt = require("bcryptjs");
(async () => {
  _dummyHash = await bcrypt.hash("dummy_timing_normalizer", 12);
})();

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }

    // `.select('+password')` overrides the `select: false` on the password
    // field so we get the hash back for comparison.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user) {
      // User not found — still run bcrypt to normalize response time
      await bcrypt.compare(password, _dummyHash);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken({ id: user.id, email: user.email });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
