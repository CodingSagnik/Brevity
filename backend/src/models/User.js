"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * WHY bcryptjs OVER bcrypt?
 * ─────────────────────────
 * The native `bcrypt` package requires compiling C++ bindings during `npm install`
 * (needs node-gyp, Python, make). Inside a Docker Alpine image this either fails
 * outright or forces a multi-step build with build tools. `bcryptjs` is pure
 * JavaScript — it installs in any environment with zero native compilation,
 * while exposing an identical async API. The performance difference (~30%)
 * is irrelevant here: bcrypt is intentionally slow, and auth endpoints are
 * not on the hot path.
 *
 * SALT ROUNDS = 12
 * ─────────────────
 * Each additional round doubles the hashing time. At 12 rounds, hashing one
 * password takes ~250 ms on a modern CPU. An attacker brute-forcing offline
 * can only attempt ~4 hashes/second per core — compared to billions/second for
 * unsalted SHA-256. This is the security-UX sweet spot for a web API.
 */
const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,   // normalise before storage; "User@Example.com" == "user@example.com"
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // `select: false` means password is NEVER included in query results unless
      // explicitly requested with `.select('+password')`. This prevents the hash
      // from leaking into any response that accidentally serialises the document.
      select: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
//
// Mongoose middleware that runs before every .save() call. Using a hook rather
// than hashing in the controller has one critical advantage: no matter where
// in the codebase a User document is saved (controller, seed script, admin
// panel), the password is guaranteed to be hashed. There is no code path that
// can accidentally persist a plaintext password.
//
// `this.isModified('password')` ensures we only re-hash when the password
// field actually changed — not on every profile update.
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance Method ──────────────────────────────────────────────────────────
//
// Attaching comparison logic directly to the model keeps the controller clean:
//   const isMatch = await user.comparePassword(plainText);
//
// bcrypt.compare() is timing-safe — it always takes the same amount of time
// regardless of how many characters match, preventing timing-based attacks.
userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

// ─── toJSON Transform ─────────────────────────────────────────────────────────
//
// Strip the password hash whenever a User document is serialised to JSON,
// even if it was explicitly selected for internal use. Belt-and-suspenders
// on top of `select: false`.
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
