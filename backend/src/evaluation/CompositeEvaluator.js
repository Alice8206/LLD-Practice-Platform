import Feedback from "../models/Feedback.js";
import { DeterministicChecklistEvaluator } from "./DeterministicChecklistEvaluator.js";
import { LLMReasoningEvaluator } from "./LLMReasoningEvaluator.js";

/**
 * CompositeEvaluator
 *
 * Runs a list of EvaluationStrategy implementations over one submission and
 * merges their partial results into a single Feedback document. Weighting
 * between deterministic and qualitative scores lives here, in one place, so
 * it can be tuned without touching either evaluator.
 *
 * To add a third evaluation approach later (e.g. a static-analysis
 * evaluator for real code submissions), just push another strategy into the
 * `strategies` array passed to the constructor — nothing else in the app
 * needs to change.
 */
export class CompositeEvaluator {
  constructor(strategies = [new DeterministicChecklistEvaluator(), new LLMReasoningEvaluator()]) {
    this.strategies = strategies;
  }

  async run(problem, submission) {
    const merged = {};
    for (const strategy of this.strategies) {
      const partial = await strategy.evaluate(problem, submission);
      Object.assign(merged, partial);
    }

    const detScore = merged.deterministic?.score ?? 0;
    const qualScore = merged.qualitative?.score ?? 0;
    // Deterministic coverage is weighted lower than reasoning quality,
    // since "mentioned the right nouns" matters less than "reasoned well".
    const overallScore = Math.round(detScore * 0.35 + qualScore * 0.65);

    const feedback = await Feedback.create({
      submissionId: submission._id,
      deterministic: merged.deterministic,
      qualitative: merged.qualitative,
      overallScore,
      summary: merged.summary || "",
    });

    return feedback;
  }
}

export default CompositeEvaluator;
