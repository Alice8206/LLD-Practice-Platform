import mongoose from "mongoose";

/**
 * Attempt
 * One learner's working draft for one problem. A learner can have multiple
 * attempts for the same problem over time (practice loop -> "try again").
 * The attempt holds the live content; a Submission is an immutable snapshot
 * of an attempt taken at submit time.
 */
const AttemptSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    learnerId: { type: String, required: true }, // simple string identity, no auth system for MVP
    attemptNumber: { type: Number, required: true }, // nth attempt by this learner on this problem

    content: {
      explanation: { type: String, default: "" }, // free text: responsibilities, reasoning, trade-offs
      diagram: { type: String, default: "" }, // mermaid classDiagram source
    },

    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
    },
  },
  { timestamps: true }
);

AttemptSchema.index({ problemId: 1, learnerId: 1, attemptNumber: 1 }, { unique: true });

export default mongoose.model("Attempt", AttemptSchema);
