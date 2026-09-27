import mongoose from "mongoose";

/**
 * Feedback
 * The result of running one or more EvaluationStrategy implementations over
 * a Submission. Stored as its own document (rather than embedded in
 * Submission) so a submission could, in principle, be re-evaluated by a
 * different strategy later without losing the earlier report.
 */
const FeedbackSchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", required: true },

    // Deterministic, rule-based findings. Cheap, fast, explainable, no ambiguity.
    deterministic: {
      score: { type: Number, default: 0 }, // 0-100
      entityCoverage: [{ name: String, found: Boolean }],
      relationshipCoverage: [{ name: String, found: Boolean }],
      patternCoverage: [{ name: String, found: Boolean }],
      diagramPresent: { type: Boolean, default: false },
      notes: [{ type: String }],
    },

    // LLM-authored qualitative reasoning. Handles the "more than one valid
    // design" problem: it evaluates against principles, not a single answer key.
    qualitative: {
      score: { type: Number, default: 0 }, // 0-100
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      solidNotes: { type: String, default: "" },
      extensibilityNotes: { type: String, default: "" },
      rawModelUsed: { type: String, default: "" },
    },

    overallScore: { type: Number, default: 0 }, // weighted combination
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", FeedbackSchema);
