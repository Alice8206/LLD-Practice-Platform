import mongoose from "mongoose";

/**
 * Submission
 * Immutable snapshot of an Attempt's content at the moment of submission,
 * plus the lifecycle of its evaluation. Keeping this separate from Attempt
 * means an attempt can be edited/resubmitted without losing the history of
 * what was actually graded each time.
 */
const SubmissionSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    learnerId: { type: String, required: true },

    contentSnapshot: {
      explanation: { type: String, default: "" },
      diagram: { type: String, default: "" },
    },

    evaluationStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    retryCount: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Submission", SubmissionSchema);
