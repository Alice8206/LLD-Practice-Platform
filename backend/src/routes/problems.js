import { Router } from "express";
import Problem from "../models/Problem.js";

const router = Router();

// GET /api/problems - list (lightweight fields only)
router.get("/", async (_req, res) => {
  const problems = await Problem.find({}, "slug title difficulty tags summary").sort({ createdAt: 1 });
  res.json(problems);
});

// GET /api/problems/:id - full detail for the workspace
router.get("/:id", async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  if (!problem) return res.status(404).json({ error: "Problem not found" });
  res.json(problem);
});

export default router;
