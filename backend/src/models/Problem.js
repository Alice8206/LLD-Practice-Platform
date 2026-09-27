import mongoose from "mongoose";

/**
 * Problem
 * A single LLD practice problem with enough context to attempt it and
 * enough structure for the deterministic evaluator to check against.
 */
const ProblemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    tags: [{ type: String }],
    summary: { type: String, required: true },
    requirements: [{ type: String, required: true }], // functional requirements the design must satisfy
    constraints: [{ type: String }], // things the design should respect (NFRs, scale hints, etc.)

    // Used by the deterministic evaluator as a lightweight, extensible checklist.
    // Kept data-driven (not hardcoded per-problem in evaluator code) so new
    // problems can be added without touching evaluation logic.
    expectedConcepts: {
      entities: [{ type: String }], // e.g. ["ParkingSpot", "Vehicle", "Ticket"]
      relationships: [{ type: String }], // e.g. ["ParkingLot has-many ParkingSpot"]
      patterns: [{ type: String }], // e.g. ["Strategy", "Singleton", "Factory"]
    },
  },
  { timestamps: true }
);

export default mongoose.model("Problem", ProblemSchema);
