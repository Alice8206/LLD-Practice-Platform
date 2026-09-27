import { EvaluationStrategy } from "./EvaluationStrategy.js";

/**
 * DeterministicChecklistEvaluator
 *
 * Fast, free, 100% explainable, and never ambiguous — so it's the right
 * tool for "did the design mention the entities/relationships/patterns this
 * problem expects" and "is there actually a diagram". It cannot judge
 * whether the design is *good*; it can only judge whether the vocabulary of
 * a reasonable solution shows up. That judgement call is deliberately
 * pushed to the LLM evaluator instead (see LLMReasoningEvaluator).
 *
 * Because expectedConcepts lives on the Problem document (data), adding a
 * new problem never requires touching this class.
 */
export class DeterministicChecklistEvaluator extends EvaluationStrategy {
  async evaluate(problem, submission) {
    const text = `${submission.contentSnapshot.explanation}\n${submission.contentSnapshot.diagram}`.toLowerCase();
    const diagram = submission.contentSnapshot.diagram || "";

    const checkList = (items = []) =>
      items.map((name) => ({ name, found: text.includes(name.toLowerCase()) }));

    const entityCoverage = checkList(problem.expectedConcepts?.entities);
    const relationshipCoverage = checkList(problem.expectedConcepts?.relationships);
    const patternCoverage = checkList(problem.expectedConcepts?.patterns);

    const diagramPresent = /classDiagram/i.test(diagram) && diagram.trim().length > 20;

    const scored = [...entityCoverage, ...relationshipCoverage, ...patternCoverage];
    const coverageRatio = scored.length ? scored.filter((s) => s.found).length / scored.length : 1;

    let score = Math.round(coverageRatio * 80); // up to 80 pts for concept coverage
    if (diagramPresent) score += 20; // 20 pts for actually providing a diagram
    score = Math.min(100, score);

    const notes = [];
    if (!diagramPresent) notes.push("No mermaid class diagram detected — a diagram is expected for this problem.");
    entityCoverage.filter((e) => !e.found).forEach((e) => notes.push(`Entity "${e.name}" was not clearly mentioned.`));
    relationshipCoverage
      .filter((r) => !r.found)
      .forEach((r) => notes.push(`Relationship "${r.name}" was not clearly represented.`));

    return {
      deterministic: {
        score,
        entityCoverage,
        relationshipCoverage,
        patternCoverage,
        diagramPresent,
        notes,
      },
    };
  }
}

export default DeterministicChecklistEvaluator;
