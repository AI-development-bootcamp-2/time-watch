const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const healthRouter   = require("./routes/health");
const authRouter     = require("./routes/auth");
const timerRouter    = require("./routes/timer");
const usersRouter    = require("./routes/users");
const clientsRouter  = require("./routes/clients");
const projectsRouter = require("./routes/projects");
const tasksRouter    = require("./routes/tasks");
const reportsRouter  = require("./routes/reports");
const absencesRouter = require("./routes/absences");
const monthsRouter   = require("./routes/months");
const adminRouter        = require("./routes/admin");
const workEntriesRouter  = require("./routes/workEntries");

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/health",   healthRouter);
  app.use("/api/auth",     authRouter);
  app.use("/api/timer",    timerRouter);
  app.use("/api/users",    usersRouter);
  app.use("/api/clients",  clientsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks",    tasksRouter);
  app.use("/api/reports",  reportsRouter);
  app.use("/api/absences", absencesRouter);
  app.use("/api/months",   monthsRouter);
  app.use("/api/admin",        adminRouter);
  app.use("/api/work-entries", workEntriesRouter);

  return app;
}

module.exports = { createApp };
