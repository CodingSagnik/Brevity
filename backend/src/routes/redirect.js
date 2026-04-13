"use strict";

const { Router } = require("express");
const { redirectToUrl } = require("../controllers/url.controller");

const router = Router();

// GET /:shortId
router.get("/:shortId", redirectToUrl);

module.exports = router;
