"use strict";

const { Router } = require("express");
const { shortenUrl } = require("../controllers/url.controller");
const { optionalAuth } = require("../middleware/auth.middleware");

const router = Router();

// POST /api/shorten
// optionalAuth runs first:
//   • No token  → req.userId = undefined → anonymous link saved
//   • Valid JWT → req.userId = "<id>"    → link attributed to the user
//   • Bad JWT   → 401 returned before the controller is reached
router.post("/shorten", optionalAuth, shortenUrl);

module.exports = router;
