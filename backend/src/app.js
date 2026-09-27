import express from "express";
import cors from "cors";
import problemsRouter from "./routes/problems.js";
import attemptsRouter from "./routes/attempts.js";
import submissionsRouter from "./routes/submissions.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/problems", problemsRouter);
  app.use("/api/attempts", attemptsRouter);
  app.use("/api/submissions", submissionsRouter);

  // Centralized error handler so route handlers can just `throw`/reject.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  });

  return app;
}

export default createApp;
