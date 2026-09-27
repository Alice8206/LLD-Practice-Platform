/**
 * EvaluationStrategy (Strategy pattern)
 *
 * This is the extension point the assignment asks about: "how would your
 * design accommodate another evaluation approach or another submission
 * format later?"
 *
 * Any new evaluator (e.g. a static-analysis evaluator for real code
 * submissions, a peer-review evaluator, a rubric-based evaluator for a
 * different problem type) implements this same interface and can be added
 * to a CompositeEvaluator without changing the queue, the routes, or the
 * models. Submission format is deliberately generic
 * (`{ explanation, diagram }`) so a future `code` field could be added to
 * Attempt/Submission and a `CodeStaticAnalysisEvaluator` could be plugged in
 * the same way.
 */
export class EvaluationStrategy {
  /**
   * @param {import("../models/Problem.js").default} problem - mongoose doc
   * @param {import("../models/Submission.js").default} submission - mongoose doc
   * @returns {Promise<object>} a partial feedback object, merged by the caller
   */
  // eslint-disable-next-line no-unused-vars
  async evaluate(problem, submission) {
    throw new Error("evaluate() must be implemented by subclasses");
  }

  get name() {
    return this.constructor.name;
  }
}

export default EvaluationStrategy;
