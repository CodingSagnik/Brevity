"use strict";

/**
 * ─── Analytics Service ────────────────────────────────────────────────────────
 *
 * HOW NODE'S EVENT LOOP MAKES THIS NON-BLOCKING
 * ─────────────────────────────────────────────
 * Node.js runs JavaScript on a single thread. It achieves high concurrency not
 * through parallel threads but through an event-driven, non-blocking I/O model
 * powered by the libuv library underneath V8.
 *
 * When this module's trackClick() is called:
 *
 *   1. The JS thread calls Analytics.findOneAndUpdate(). Mongoose serialises the
 *      query and hands it to the MongoDB Node.js driver.
 *
 *   2. The driver opens a socket write to the MongoDB container. This I/O
 *      operation is delegated to libuv's I/O thread pool — the OS takes over
 *      and the JS thread is immediately released.
 *
 *   3. The calling code (url.controller.js) does NOT await the returned Promise.
 *      It "floats" — it is registered in the microtask queue but the call site
 *      moves on instantly and issues res.redirect(). The HTTP response headers
 *      are written to the TCP socket and the user's browser receives its 302.
 *
 *   4. Some milliseconds later, when the MongoDB write completes, libuv places a
 *      callback on Node's event queue. In a future iteration of the event loop,
 *      the JS thread picks it up, the Promise resolves (or rejects), and the
 *      .catch() handler in the controller logs any error — silently, without
 *      affecting any in-flight HTTP requests.
 *
 *                     ┌─────────────────────────────────────────┐
 *                     │          Node.js Event Loop             │
 *                     │                                         │
 *  Incoming request ──► JS Thread ──► res.redirect() ─────────►│──► User gets 301
 *                     │     │                                   │
 *                     │     └──► trackClick() ──► libuv I/O    │
 *                     │                              │          │
 *                     │     ┌────────────────────────┘          │
 *                     │     ▼  (future tick)                    │
 *                     │  MongoDB write completes silently        │
 *                     └─────────────────────────────────────────┘
 *
 * This is the foundational pattern behind every "fire-and-forget" side-effect
 * in a Node.js backend: logging, audit trails, analytics, webhook dispatches.
 * The user-facing latency is determined solely by the critical path (Redis/Mongo
 * lookup + redirect). The analytics write is completely off that path.
 */

const Analytics = require("../models/Analytics");

/**
 * Extracts the real client IP from the request.
 *
 * Behind a reverse proxy (nginx, AWS ALB, Cloudflare) the original client IP
 * is forwarded in the X-Forwarded-For header as a comma-separated list.
 * The leftmost entry is the original client; the rest are intermediate proxies.
 * We take only the first to avoid storing the full proxy chain.
 *
 * In a raw Docker Compose setup without a proxy, req.ip is the container's
 * gateway IP. Set `app.set("trust proxy", 1)` in server.js when adding nginx.
 *
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function extractIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || null;
}

/**
 * Records a single click event against the Analytics document for shortId.
 *
 * UPSERT STRATEGY
 * ───────────────
 * findOneAndUpdate with { upsert: true } performs an atomic "create-or-update"
 * in a single round-trip. On the first ever click for a shortId it creates the
 * Analytics document automatically; on every subsequent click it updates it.
 * No separate "ensure document exists" step is needed.
 *
 * ATOMIC OPERATORS
 * ────────────────
 * $inc: { clickCount: 1 }
 *   Atomically increments the counter. Using $inc instead of read-modify-write
 *   (find → increment in JS → save) eliminates a race condition where two
 *   simultaneous clicks could both read the same value and both write n+1
 *   instead of n+2.
 *
 * $push with $each / $slice
 *   $each wraps the single event in an array so $slice can be applied.
 *   $slice: -MAX_EVENTS keeps only the most-recent N events, preventing the
 *   clickEvents array from growing without bound and hitting MongoDB's 16 MB
 *   document size limit on high-traffic links.
 *   clickCount remains accurate regardless of how many events are retained.
 *
 * @param {string} shortId
 * @param {import("express").Request} req
 * @returns {Promise<void>}
 */
async function trackClick(shortId, req) {
  const MAX_EVENTS = 1000;

  const event = {
    timestamp: new Date(),
    userAgent: req.headers["user-agent"] || null,
    ip: extractIp(req),
    referrer: req.headers["referer"] || req.headers["referrer"] || null,
  };

  await Analytics.findOneAndUpdate(
    { shortId },
    {
      $inc: { clickCount: 1 },
      $push: {
        clickEvents: {
          $each: [event],
          $slice: -MAX_EVENTS,
        },
      },
    },
    {
      upsert: true,
      // We don't need the updated document returned — returning false
      // avoids transferring the (potentially large) document back over the wire.
      new: false,
    }
  );
}

module.exports = { trackClick };
