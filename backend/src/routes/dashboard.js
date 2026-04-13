"use strict";

const { Router } = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getStats, getHistory } = require("../controllers/dashboard.controller");

const router = Router();

// Apply requireAuth to every route in this router at once.
// Any unauthenticated request is rejected with 401 before a controller runs.
router.use(requireAuth);

// GET /api/dashboard/stats
// Returns totalUrls, totalClicks, avgClicksPerUrl for the logged-in user.
router.get("/stats", getStats);

// GET /api/dashboard/history?page=1&limit=20
// Returns a paginated list of the user's links with per-link click counts.
router.get("/history", getHistory);

module.exports = router;
