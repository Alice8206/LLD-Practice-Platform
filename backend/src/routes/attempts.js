import { Router } from "express";
import Attempt from "../models/Attempt.js";
import Problem from "../models/Problem.js";

const router = Router();

// POST /api/attempts { problemId, learnerId } - start a new attempt (practice loop: "try again")
router.post("/", async (req, res) => {
  const { problemId, learnerId } = req.body;
  if (!problemId || !learnerId) {
    return res.status(400).json({ error: "problemId and learnerId are required" });
  }

  const problem = await Problem.findById(problemId);
  if (!problem) return res.status(404).json({ error: "Problem not found" });

  const previousCount = await Attempt.countDocuments({ problemId, learnerId });

  const attempt = await Attempt.create({
    problemId,
    learnerId,
    attemptNumber: previousCount + 1,
    content: { explanation: "", diagram: "" },
    status: "draft",
  });

  res.status(201).json(attempt);
});

// GET /api/attempts?problemId=&learnerId= - history for the "Review" step
router.get("/", async (req, res) => {
  const { problemId, learnerId } = req.query;
  const filter = {};
  if (problemId) filter.problemId = problemId;
  if (learnerId) filter.learnerId = learnerId;

  const attempts = await Attempt.find(filter).sort({ attemptNumber: -1 });
  res.json(attempts);
});

// GET /api/attempts/:id
router.get("/:id", async (req, res) => {
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  res.json(attempt);
});

// PUT /api/attempts/:id { explanation, diagram } - autosave the draft while the learner is working
router.put("/:id", async (req, res) => {
  const { explanation, diagram } = req.body;
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  if (attempt.status === "submitted") {
    return res.status(409).json({ error: "Attempt already submitted; start a new attempt to keep practicing." });
  }

  if (explanation !== undefined) attempt.content.explanation = explanation;
  if (diagram !== undefined) attempt.content.diagram = diagram;
  await attempt.save();

  res.json(attempt);
});

export default router;
