const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const { authenticate } = require("./middleware/auth");
const absencesRouter = require("./routes/absences");

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/absences", authenticate, absencesRouter);

  return app;
}

module.exports = { createApp };
