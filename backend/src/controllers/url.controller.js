"use strict";

const { nanoid } = require("nanoid");
const Url = require("../models/Url");
const { isValidUrl } = require("../utils/isValidUrl");
const redisClient = require("../config/redis");
const { trackClick } = require("../services/analytics.service");

/**
 * Redis key namespace for URL mappings.
 *
 * Prefixing every key with "url:" creates a logical namespace inside the shared
 * Redis instance. This matters when the same Redis server later holds sessions,
 * rate-limit counters, or job queues — the prefix prevents key collisions and
 * makes it trivial to scan/delete all URL entries with: SCAN 0 MATCH url:*
 */
const cacheKey = (shortId) => `url:${shortId}`;

/**
 * TTL (Time-To-Live) for a cached entry, in seconds.
 *
 * 86 400 s = 24 hours. After this window Redis automatically evicts the key.
 * On the next request the system falls back to MongoDB, re-populates the cache,
 * and the TTL clock resets. Configurable via env so staging/prod can differ
 * without a code change.
 */
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || "86400", 10);

// ─── POST /api/shorten ────────────────────────────────────────────────────────

/**
 * Validates the submitted URL, generates a unique 6-character short ID,
 * persists the mapping to MongoDB, and returns the shortened URL.
 *
 * Collision handling: nanoid(6) over a 64-char alphabet gives 64^6 ≈ 68 billion
 * possible IDs. The chance of a collision is negligible in any realistic dataset,
 * but we still retry up to 3 times on a MongoDB duplicate-key error (code 11000)
 * rather than surfacing a confusing 500 to the client.
 */
const shortenUrl = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "url field is required" });
    }

    if (!isValidUrl(url)) {
      return res.status(422).json({
        error: "Invalid URL. Provide an absolute http:// or https:// address.",
      });
    }

    const MAX_RETRIES = 3;
    let saved = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        saved = await Url.create({
          originalUrl: url,
          shortId: nanoid(6),
          // req.userId is set by optionalAuth when a valid JWT is present.
          // It is undefined (falsy) for anonymous requests, so the Url schema
          // default of null applies — no conditional logic needed here.
          userId: req.userId || null,
        });
        break;
      } catch (err) {
        // 11000 = MongoDB duplicate key — regenerate and retry
        if (err.code === 11000 && attempt < MAX_RETRIES - 1) continue;
        throw err;
      }
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    return res.status(201).json({
      shortUrl: `${baseUrl}/${saved.shortId}`,
      shortId: saved.shortId,
      originalUrl: saved.originalUrl,
      createdAt: saved.createdAt,
      // Let the client know whether this link is tied to an account.
      // Useful for conditionally showing "View in dashboard" in the UI.
      owner: saved.userId ? true : false,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /:shortId  (Cache-Aside Pattern) ────────────────────────────────────

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    THE CACHE-ASIDE PATTERN                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Also known as "Lazy Loading", Cache-Aside is the most widely used      ║
 * ║  caching strategy in web backends. The application code — not the cache  ║
 * ║  infrastructure — is responsible for keeping the cache populated.        ║
 * ║                                                                          ║
 * ║  READ PATH                                                               ║
 * ║  ─────────                                                               ║
 * ║  1. Check the cache for the key.                                         ║
 * ║  2. CACHE HIT  → serve from cache. The database is never contacted.      ║
 * ║     CACHE MISS → query the database (the "source of truth").             ║
 * ║                  Write the result back into the cache with a TTL.        ║
 * ║                  Serve the response.                                     ║
 * ║                                                                          ║
 * ║  WHY THIS IS FASTER                                                      ║
 * ║  ──────────────────                                                      ║
 * ║  • Redis is an in-memory store. A GET command round-trips in ~0.1–1 ms.  ║
 * ║  • A MongoDB query requires disk I/O, BSON deserialisation, and network  ║
 * ║    round-trips — typically 2–20 ms even on a local Docker network.       ║
 * ║  • For a URL shortener, reads far outnumber writes (Zipf distribution).  ║
 * ║    Once a popular link is cached, all subsequent redirects are served    ║
 * ║    entirely from RAM, reducing MongoDB load by orders of magnitude.      ║
 * ║                                                                          ║
 * ║  TRADE-OFFS                                                              ║
 * ║  ──────────                                                              ║
 * ║  • Stale data: if the originalUrl is updated in MongoDB, the cached      ║
 * ║    value stays valid until the TTL expires (max 24 h here). Acceptable   ║
 * ║    for URL redirection; fix with explicit cache invalidation on updates. ║
 * ║  • Cold start: the very first request for any key always hits the DB.    ║
 * ║    High-traffic links warm up quickly; low-traffic links experience      ║
 * ║    occasional cache misses, which is perfectly fine.                     ║
 * ║  • Cache stampede: if a hot key expires and hundreds of concurrent       ║
 * ║    requests all miss simultaneously, they all hit the DB at once.        ║
 * ║    Mitigation: probabilistic early expiry or a distributed lock (future).║
 * ║                                                                          ║
 * ║  FAIL-OPEN DESIGN                                                        ║
 * ║  ─────────────────                                                       ║
 * ║  Cache errors are caught and logged but never propagate to the caller.   ║
 * ║  If Redis is unavailable the system degrades gracefully to MongoDB-only  ║
 * ║  lookups — slower, but always correct.                                   ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
const redirectToUrl = async (req, res, next) => {
  const { shortId } = req.params;
  const key = cacheKey(shortId);

  // ── Step 1: Check the cache ────────────────────────────────────────────────
  //
  // We wrap the Redis call in its own try/catch so that a Redis outage cannot
  // take down the redirect flow. This is the "fail-open" principle: the cache
  // is purely an optimisation; correctness must never depend on it.
  try {
    const cached = await redisClient.get(key);

    if (cached !== null) {
      // ── Step 2a: CACHE HIT ───────────────────────────────────────────────
      //
      // The originalUrl was found in Redis. We redirect immediately without
      // touching MongoDB. This is the fast path — no disk I/O, no query
      // planner, no BSON deserialisation.
      //
      // We also refresh the TTL ("sliding window") so frequently-used links
      // stay warm indefinitely while unused ones naturally expire.
      redisClient.expire(key, CACHE_TTL_SECONDS).catch(() => {});

      // ── Fire-and-forget analytics ────────────────────────────────────────
      //
      // NODE EVENT LOOP — WHY THIS DOES NOT BLOCK THE RESPONSE
      // ────────────────────────────────────────────────────────
      // Calling trackClick() without `await` starts the async work and
      // immediately returns a pending Promise. The JS thread does not pause.
      // res.redirect() is called next, writing the 302 headers to the TCP
      // socket — the user's browser receives the redirect right now.
      //
      // Meanwhile, the Promise floats in the microtask queue. When the
      // MongoDB findOneAndUpdate I/O completes (typically 5–20 ms later),
      // libuv places the callback on the event queue. In a future event-loop
      // tick the JS thread processes it — completely decoupled from this
      // request's response cycle.
      //
      // The .catch() is mandatory. A floating Promise without error handling
      // would emit an UnhandledPromiseRejection warning and, in Node ≥ 15,
      // crash the process. Here we log and swallow so analytics failures are
      // invisible to the user but still observable in server logs.
      trackClick(shortId, req).catch((err) =>
        console.error("[Analytics] Failed to record click (cache hit):", err.message)
      );

      console.log(`[Cache] HIT  — ${key}`);
      return res.redirect(302, cached);
    }
  } catch (cacheErr) {
    // Redis is down or returned an unexpected error. Log it and fall through
    // to the MongoDB lookup so the user's request still succeeds.
    console.error(`[Cache] Error reading key "${key}":`, cacheErr.message);
  }

  // ── Step 2b: CACHE MISS — consult the source of truth ─────────────────────
  //
  // Redis had no entry for this shortId. We now query MongoDB, which is the
  // authoritative, persistent store. This path is slower but always correct.
  try {
    const record = await Url.findOne({ shortId, isActive: true }).lean();

    if (!record) {
      return res.status(404).json({ error: `Short link '${shortId}' not found.` });
    }

    // ── Step 3: POPULATE THE CACHE ──────────────────────────────────────────
    //
    // Before redirecting, write the result to Redis so every subsequent
    // request for this shortId takes the fast path.
    //
    // SET key value EX ttl  — atomic: sets the value and TTL in one command.
    //
    // Fire-and-forget: no await, so a slow Redis write never blocks the
    // HTTP response.
    redisClient
      .set(key, record.originalUrl, "EX", CACHE_TTL_SECONDS)
      .then(() => console.log(`[Cache] MISS → populated — ${key} (TTL ${CACHE_TTL_SECONDS}s)`))
      .catch((err) => console.error(`[Cache] Failed to populate key "${key}":`, err.message));

    // ── Fire-and-forget analytics ────────────────────────────────────────────
    //
    // Same event-loop pattern as the cache-hit path above. Two independent
    // async side-effects (cache write + analytics write) are both launched
    // without blocking. The event loop interleaves them with all other
    // in-flight I/O while the JS thread is free to handle new requests.
    trackClick(shortId, req).catch((err) =>
      console.error("[Analytics] Failed to record click (cache miss):", err.message)
    );

    return res.redirect(302, record.originalUrl);
  } catch (err) {
    next(err);
  }
};

module.exports = { shortenUrl, redirectToUrl };
