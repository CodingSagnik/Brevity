const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      trim: true,
    },
    shortId: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(6),
      index: true,
    },
    // Optional owner reference. null = anonymous link; ObjectId = registered user.
    // Indexed so "fetch all links for user X" is an efficient index scan, not
    // a full collection scan. sparse: true means the index skips null entries,
    // keeping its size proportional only to authenticated links.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: { sparse: true },
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// TTL index — documents with a non-null expiresAt are automatically removed
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model("Url", urlSchema);
