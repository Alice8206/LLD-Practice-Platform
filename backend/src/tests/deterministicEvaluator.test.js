import { DeterministicChecklistEvaluator } from "../evaluation/DeterministicChecklistEvaluator.js";

function makeProblem(overrides = {}) {
  return {
    expectedConcepts: {
      entities: ["ParkingSpot", "Vehicle"],
      relationships: ["ParkingLot has-many ParkingFloor"],
      patterns: ["Strategy"],
    },
    ...overrides,
  };
}

function makeSubmission(explanation = "", diagram = "") {
  return { contentSnapshot: { explanation, diagram } };
}

describe("DeterministicChecklistEvaluator", () => {
  const evaluator = new DeterministicChecklistEvaluator();

  test("gives low score and useful notes when nothing expected is mentioned", async () => {
    const result = await evaluator.evaluate(makeProblem(), makeSubmission("I made a design.", ""));
    expect(result.deterministic.score).toBeLessThan(30);
    expect(result.deterministic.diagramPresent).toBe(false);
    expect(result.deterministic.notes.length).toBeGreaterThan(0);
  });

  test("detects a mermaid class diagram and full concept coverage", async () => {
    const explanation = "The ParkingLot manages Vehicle entry using a Strategy for spot assignment.";
    const diagram = "classDiagram\nclass ParkingLot\nclass ParkingSpot\nclass Vehicle\nParkingLot --> ParkingFloor : has-many";
    const result = await evaluator.evaluate(makeProblem(), makeSubmission(explanation, diagram));
    expect(result.deterministic.diagramPresent).toBe(true);
    expect(result.deterministic.score).toBeGreaterThanOrEqual(80);
    expect(result.deterministic.entityCoverage.every((e) => e.found)).toBe(true);
  });

  test("handles a problem with no expected concepts (edge case) without throwing", async () => {
    const result = await evaluator.evaluate(makeProblem({ expectedConcepts: {} }), makeSubmission("anything"));
    expect(result.deterministic.score).toBeGreaterThanOrEqual(0);
  });
});
