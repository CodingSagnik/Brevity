"use strict";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Returns true only when the string is an absolute HTTP/HTTPS URL.
 * Relies on the WHATWG URL parser (built into Node ≥ 10), which matches
 * what browsers actually accept — no regex fragility.
 *
 * @param {string} raw
 * @returns {boolean}
 */
function isValidUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return false;

  try {
    const { protocol } = new URL(raw);
    return ALLOWED_PROTOCOLS.has(protocol);
  } catch {
    return false;
  }
}

module.exports = { isValidUrl };
