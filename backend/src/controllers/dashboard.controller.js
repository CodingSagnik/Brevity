"use strict";

const mongoose = require("mongoose");
const Url = require("../models/Url");

// ─── Shared context ───────────────────────────────────────────────────────────

/**
 * WHY AGGREGATION PIPELINES INSTEAD OF IN-MEMORY CALCULATION
 * ──────────────────────────────────────────────────────────
 * The naive alternative to every endpoint below is:
 *
 *   const urls      = await Url.find({ userId });           // 1 query → N documents
 *   const analytics = await Promise.all(                    // N more queries
 *     urls.map(u => Analytics.findOne({ shortId: u.shortId }))
 *   );
 *   const totalClicks = analytics.reduce((s, a) => s + (a?.clickCount ?? 0), 0);
 *
 * This is the classic N+1 query problem:
 *   • 1 query fetches the URL list.
 *   • N individual queries fetch each analytics document.
 *   • All N analytics documents are transferred across the Docker network.
 *   • Summation, averaging, and sorting happen in JavaScript — single-threaded,
 *     in Node.js heap memory, after all data has already arrived.
 *
 * For a user with 1 000 links that means 1 001 round-trips and every analytics
 * document loaded into RAM before a single number is produced.
 *
 * THE AGGREGATION APPROACH
 * ────────────────────────
 * MongoDB's aggregation framework is a server-side data-processing pipeline.
 * Each stage transforms the dataset before passing it to the next, and all
 * computation happens inside the MongoDB process — written in C++, not JS.
 *
 *   $match  → uses an index to discard unrelated documents immediately.
 *             Only matching documents proceed to later stages.
 *             This is the most important stage for performance: the earlier
 *             and more selective the $match, the less work every later stage does.
 *
 *   $lookup → a server-side join. MongoDB fetches related documents from a
 *             second collection without a second network round-trip from Node.
 *             The join runs inside the database engine on local storage.
 *
 *   $group  → performs aggregation (SUM, AVG, COUNT) in C++ across the already-
 *             filtered and joined dataset. The result collapses N rows into M
 *             summary rows (M ≪ N).
 *
 *   $project → strips every field not needed by the client before the final
 *              result leaves the database, minimising the bytes sent over the wire.
 *
 * What travels over the Docker network at the end:
 *   Stats   → one document with 3 numbers.
 *   History → one page of up to 20 lean URL summaries.
 *
 * Compared to the naive approach, this is O(1) round-trips regardless of how
 * many links the user has created.
 */

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────

const getStats = async (req, res, next) => {
  try {
    /**
     * Convert the userId string (stored in req.userId by requireAuth) back to
     * a MongoDB ObjectId. $match compares BSON types, so the string "abc123"
     * would NOT match the ObjectId ObjectId("abc123") without this cast.
     */
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [result] = await Url.aggregate([
      // ── Stage 1: $match ────────────────────────────────────────────────────
      //
      // Filter the urls collection to documents owned by this user.
      //
      // PERFORMANCE: This $match sits at the front of the pipeline and uses
      // the sparse compound index on { userId } that we defined in Url.js.
      // MongoDB's query planner performs an index scan (IXSCAN) rather than a
      // full collection scan (COLLSCAN). Only matching documents are loaded into
      // the pipeline's working set — all subsequent stages operate on this much
      // smaller dataset.
      {
        $match: { userId, isActive: true },
      },

      // ── Stage 2: $lookup (server-side left outer join) ─────────────────────
      //
      // For each Url document, fetch the corresponding Analytics document from
      // the "analytics" collection where analytics.shortId === url.shortId.
      //
      // "Left outer join" semantics: URLs that have never been clicked will have
      // NO analytics document. $lookup still passes them through with an empty
      // array in the "analytics" field — they are not silently dropped.
      //
      // This entire join runs inside the MongoDB server. Node.js issues one
      // network command for the whole pipeline and waits for one response.
      {
        $lookup: {
          from: "analytics",       // the target collection name (not the Mongoose model name)
          localField: "shortId",   // field on the Url document
          foreignField: "shortId", // matching field on the Analytics document
          as: "analytics",         // output field name — an array of matched docs
        },
      },

      // ── Stage 3: $unwind ───────────────────────────────────────────────────
      //
      // $lookup always produces an array. $unwind "flattens" each Url document
      // so it has a single analytics sub-document instead of an array.
      //
      // preserveNullAndEmptyArrays: true implements the left-outer-join
      // behaviour — URLs with no analytics document still flow through the
      // pipeline with analytics set to null, rather than being dropped.
      {
        $unwind: {
          path: "$analytics",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ── Stage 4: $group ────────────────────────────────────────────────────
      //
      // Collapse all Url documents (now enriched with their analytics) into a
      // single summary document. _id: null means "group everything together".
      //
      // $sum: 1       — counts documents, equivalent to COUNT(*) in SQL.
      // $sum: field   — sums a numeric field across all documents in the group.
      // $avg: field   — computes the arithmetic mean.
      //
      // $ifNull wraps the clickCount access so URLs with no analytics record
      // (analytics is null from the preserveNullAndEmptyArrays unwind) are
      // counted as 0 rather than being excluded from the aggregation.
      //
      // All of this arithmetic runs in the MongoDB C++ process, not in Node.
      {
        $group: {
          _id: null,
          totalUrls:       { $sum: 1 },
          totalClicks:     { $sum: { $ifNull: ["$analytics.clickCount", 0] } },
          avgClicksPerUrl: { $avg: { $ifNull: ["$analytics.clickCount", 0] } },
        },
      },

      // ── Stage 5: $project ──────────────────────────────────────────────────
      //
      // Shape the final output document. Only the explicitly included fields
      // are transmitted over the network — _id is suppressed.
      //
      // $round reduces avgClicksPerUrl to 2 decimal places inside the database
      // rather than doing Math.round() in Node after the data has arrived.
      {
        $project: {
          _id: 0,
          totalUrls: 1,
          totalClicks: 1,
          avgClicksPerUrl: { $round: ["$avgClicksPerUrl", 2] },
        },
      },
    ]);

    // If the user has no URLs, the $group stage produces no documents.
    // We normalise that to a zeroed-out stats object so the client always
    // gets the same shape regardless of account age.
    return res.status(200).json(
      result ?? { totalUrls: 0, totalClicks: 0, avgClicksPerUrl: 0 }
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/history ───────────────────────────────────────────────

const getHistory = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // ── Pagination parameters ─────────────────────────────────────────────────
    //
    // Returning the full URL list in one response is an anti-pattern for
    // dashboards with hundreds of links — it wastes bandwidth and bloats the
    // client render. Cursor-based pagination (using _id as a cursor) is more
    // efficient at scale, but offset pagination is simpler to implement and
    // understand for this project.
    const page  = Math.max(1, parseInt(req.query.page  ?? "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? "20", 10)));
    const skip  = (page - 1) * limit;

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    const urls = await Url.aggregate([
      // ── Stage 1: $match ────────────────────────────────────────────────────
      //
      // Same index-backed filter as the stats pipeline. Only this user's links
      // enter the pipeline — the analytics join and project never touch
      // documents belonging to other users.
      {
        $match: { userId },
      },

      // ── Stage 2: $lookup ───────────────────────────────────────────────────
      //
      // Server-side join. For each Url, fetch its Analytics document.
      // We use a pipeline-form $lookup to project only the clickCount field
      // from the Analytics collection rather than pulling the entire document
      // (including the potentially large clickEvents array) across the wire.
      {
        $lookup: {
          from: "analytics",
          let: { sid: "$shortId" },            // expose the local field as a variable
          pipeline: [
            { $match: { $expr: { $eq: ["$shortId", "$$sid"] } } },
            { $project: { _id: 0, clickCount: 1 } }, // pull ONLY clickCount — not clickEvents
          ],
          as: "analytics",
        },
      },

      // ── Stage 3: $addFields ────────────────────────────────────────────────
      //
      // Flatten the single-element analytics array into a scalar clickCount
      // field. $arrayElemAt: ["$analytics", 0] picks the first (only) element;
      // $ifNull handles the case where the array is empty (link never clicked).
      {
        $addFields: {
          clickCount: {
            $ifNull: [{ $arrayElemAt: ["$analytics.clickCount", 0] }, 0],
          },
        },
      },

      // ── Stage 4: $sort ─────────────────────────────────────────────────────
      //
      // Sort newest-first before paginating so page 1 always shows the most
      // recently created links. Sorting happens in the database — no JS .sort().
      //
      // Note: $sort must come BEFORE $skip/$limit so pagination is applied to
      // the sorted set, not an arbitrary subset.
      {
        $sort: { createdAt: -1 },
      },

      // ── Stage 5 & 6: $skip / $limit ────────────────────────────────────────
      //
      // Implement offset pagination. Only `limit` documents are loaded from
      // the sorted result into the pipeline's memory at this point.
      // Documents before `skip` are discarded without being transmitted.
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },

      // ── Stage 7: $project ──────────────────────────────────────────────────
      //
      // Strip internal fields and compute the full shortUrl string inside the
      // database using $concat — a string operation on the server rather than
      // a .map() loop in Node.
      {
        $project: {
          _id: 0,
          shortId: 1,
          originalUrl: 1,
          shortUrl: { $concat: [baseUrl, "/", "$shortId"] },
          clickCount: 1,
          createdAt: 1,
          isActive: 1,
        },
      },
    ]);

    // Run a lean count query in parallel with the aggregation so the client
    // can render pagination controls without a second request.
    // countDocuments() uses the same userId index and is O(index entries),
    // not O(collection size).
    const total = await Url.countDocuments({ userId });

    return res.status(200).json({
      data: urls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getHistory };
