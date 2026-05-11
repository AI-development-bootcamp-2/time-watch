const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { authenticate } = require("./middleware/auth");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const errorHandler = require("./middleware/errorHandler");

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required in production');
}

function isExemptFromAuth(req) {
  if (req.path === '/api/health') return true;
  if (req.path.startsWith('/api-docs')) return true;
  if (req.method === 'POST' && req.path === '/api/auth/login') return true;
  if (req.method === 'POST' && req.path === '/api/auth/logout') return true;
  return false;
}

function createApp() {
  const app = express();

  const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (isExemptFromAuth(req)) return next();
    authenticate(req, res, next);
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api/users", usersRouter);
  app.use("/api/auth", authRouter);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
