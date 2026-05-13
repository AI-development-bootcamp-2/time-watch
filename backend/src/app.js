const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { authenticate } = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");

const healthRouter      = require("./routes/health");
const authRouter        = require("./routes/auth");
const timerRouter       = require("./routes/timer");
const usersRouter       = require("./routes/users");
const clientsRouter     = require("./routes/clients");
const projectsRouter    = require("./routes/projects");
const tasksRouter       = require("./routes/tasks");
const reportsRouter     = require("./routes/reports");
const absencesRouter    = require("./routes/absences");
const monthsRouter      = require("./routes/months");
const adminRouter       = require("./routes/admin");
const workEntriesRouter = require("./routes/workEntries");
const userTasksRouter   = require("./routes/userTasks");

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required in production');
}

function isExemptFromAuth(req) {
  const path = req.path.replace(/\/+$/, '') || '/';
  if (path === '/api/health') return true;
  if (path.startsWith('/api-docs')) return true;
  if (req.method === 'POST' && path === '/api/auth/login') return true;
  if (req.method === 'POST' && path === '/api/auth/logout') return true;
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

  app.use("/api-docs",       swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api/health",     healthRouter);
  app.use("/api/auth",       authRouter);
  app.use("/api/timer",      timerRouter);
  app.use("/api/users",      usersRouter);
  app.use("/api/clients",    clientsRouter);
  app.use("/api/projects",   projectsRouter);
  app.use("/api/tasks",      tasksRouter);
  app.use("/api/reports",    reportsRouter);
  app.use("/api/absences",   absencesRouter);
  app.use("/api/months",     monthsRouter);
  app.use("/api/admin",      adminRouter);
  app.use("/api/work-entries", workEntriesRouter);
  app.use("/api/user-tasks",   userTasksRouter);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
