"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MongoDB Connection ───────────────────────────────────────────────────────
// When running inside Docker Compose, "mongodb" resolves via Docker's internal
// DNS to the mongodb service container — no hardcoded IP needed.
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is not defined. Check your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // Mongoose 8 no longer needs useNewUrlParser / useUnifiedTopology
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting to reconnect…");
});

mongoose.connection.on("reconnected", () => {
  console.info("MongoDB reconnected.");
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// Health-check — must be registered before the catch-all redirect route
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// /api/* routes must be mounted BEFORE the /:shortId catch-all so that
// paths like /api/shorten are never swallowed by the redirect handler.
app.use("/api/auth",      require("./src/routes/auth"));
app.use("/api/dashboard", require("./src/routes/dashboard"));
app.use("/api",           require("./src/routes/urls"));

// Short-link redirects — sits at root so /{shortId} works without a prefix
app.use("/", require("./src/routes/redirect"));

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });
};

start();
