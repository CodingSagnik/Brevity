const mongoose = require("mongoose");

/**
 * Each click event captures the essential context of a single redirect.
 * Keeping it as a sub-document array means all analytics for one link live
 * in a single document — simple to query, no joins required.
 */
const clickEventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Derived from the User-Agent header
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
    // Resolved from the request IP (store raw IP — resolve asynchronously if needed)
    ip: {
      type: String,
      trim: true,
      default: null,
    },
    referrer: {
      type: String,
      trim: true,
      default: null,
    },
    // ISO 3166-1 alpha-2 country code, e.g. "US", "IN"
    country: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false } // no separate _id per sub-document keeps the array lightweight
);

const analyticsSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      ref: "Url",
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickEvents: {
      type: [clickEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Analytics", analyticsSchema);
