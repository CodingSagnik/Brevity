// ── API base URL ──────────────────────────────────────────────────────────────
//
// During local development Vite proxies every /api/* request to the backend
// container (see vite.config.js), so API_BASE = "/api" works out of the box.
//
// In production (Render Static Site) there is no Vite proxy and no Nginx layer.
// Render injects VITE_API_URL as a build-time environment variable, e.g.:
//
//   VITE_API_URL=https://brevity-backend.onrender.com
//
// Vite bakes the value into the static bundle at build time via import.meta.env.
// The trailing slash is intentionally stripped so callers can write:
//
//   fetch(`${API_BASE}/auth/login`, ...)   →  https://…/api/auth/login
//
// If VITE_API_URL is not set the fallback "/" keeps local dev working.

const base = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : "/api";

export const API_BASE = base;
