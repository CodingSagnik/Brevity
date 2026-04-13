"use strict";

/**
 * ─── Redis Client — Singleton Module ─────────────────────────────────────────
 *
 * WHY IOREDIS OVER THE OFFICIAL "redis" PACKAGE?
 * ─────────────────────────────────────────────
 * ioredis has built-in auto-reconnect with exponential back-off, a Promise-first
 * API, cluster/sentinel support, and a battle-tested track record in production
 * Node.js services. The official redis v4+ package is a fine alternative, but
 * ioredis is more commonly seen in high-throughput architectures.
 *
 * WHY A SINGLETON?
 * ────────────────
 * A Redis connection is a long-lived TCP socket. Opening a new connection per
 * request would exhaust file descriptors and add ~1-5 ms of TLS/TCP handshake
 * overhead to every cache operation. Node's module system caches the result of
 * require(), so every file that requires this module gets the same instance —
 * a singleton with zero extra bookkeeping.
 *
 * DOCKER INTERNAL DNS
 * ───────────────────
 * Inside Docker Compose, the hostname "redis" in the connection string resolves
 * to the redis service container via Docker's embedded DNS resolver. No IP
 * addresses or /etc/hosts entries are needed.
 */

const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("[Redis] REDIS_URL is not defined in the environment.");
  process.exit(1);
}

/**
 * ioredis connection options.
 *
 * maxRetriesPerRequest: null
 *   Tells ioredis NOT to throw immediately when the server is temporarily
 *   unreachable; instead it queues commands until the connection is restored.
 *   Setting this to a small integer (e.g. 3) makes sense for request-scoped
 *   operations where you want fast failure rather than queuing.
 *
 * enableReadyCheck: true (default)
 *   ioredis sends a PING after connecting and only marks the client "ready"
 *   when it receives the PONG. This prevents stale commands from being flushed
 *   before the server is actually available.
 *
 * retryStrategy
 *   Called on each reconnect attempt. Returning a delay (ms) tells ioredis to
 *   retry; returning null/undefined stops retrying. Exponential back-off with a
 *   30 s ceiling prevents thundering-herd reconnect storms.
 */
const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(attempt) {
    const delay = Math.min(100 * 2 ** attempt, 30_000);
    console.warn(`[Redis] Reconnect attempt #${attempt} — retrying in ${delay}ms`);
    return delay;
  },
});

// ─── Lifecycle Logging ────────────────────────────────────────────────────────

redisClient.on("connect", () => {
  console.log("[Redis] TCP connection established.");
});

redisClient.on("ready", () => {
  console.log("[Redis] Client ready — commands can now be executed.");
});

redisClient.on("error", (err) => {
  // Log but do NOT crash the process. The cache is an optimisation layer;
  // the system must remain functional even when Redis is down (fail-open).
  console.error("[Redis] Client error:", err.message);
});

redisClient.on("close", () => {
  console.warn("[Redis] Connection closed.");
});

redisClient.on("reconnecting", (delay) => {
  console.warn(`[Redis] Reconnecting in ${delay}ms…`);
});

module.exports = redisClient;
