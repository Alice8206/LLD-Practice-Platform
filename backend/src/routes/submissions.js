import { Router } from "express";
import Attempt from "../models/Attempt.js";
import Submission from "../models/Submission.js";
import Feedback from "../models/Feedback.js";
import { enqueue } from "../evaluation/evaluationQueue.js";

const router = Router();

// POST /api/submissions { attemptId } - submit an attempt for evaluation
router.post("/", async (req, res) => {
  const { attemptId } = req.body;
  if (!attemptId) return res.status(400).json({ error: "attemptId is required" });

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  if (attempt.status === "submitted") {
    return res.status(409).json({ error: "This attempt was already submitted." });
  }
  if (!attempt.content.explanation?.trim() && !attempt.content.diagram?.trim()) {
    return res.status(400).json({ error: "Cannot submit an empty attempt." });
  }

  attempt.status = "submitted";
  await attempt.save();

  const submission = await Submission.create({
    attemptId: attempt._id,
    problemId: attempt.problemId,
    learnerId: attempt.learnerId,
    contentSnapshot: { explanation: attempt.content.explanation, diagram: attempt.content.diagram },
    evaluationStatus: "pending",
  });

  enqueue(submission._id.toString()); // async — client polls GET /:id for status

  res.status(202).json(submission);
});

// GET /api/submissions/:id - poll status; includes feedback once completed
router.get("/:id", async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  let feedback = null;
  if (submission.evaluationStatus === "completed") {
    feedback = await Feedback.findOne({ submissionId: submission._id }).sort({ createdAt: -1 });
  }

  res.json({ submission, feedback });
});

export default router;
