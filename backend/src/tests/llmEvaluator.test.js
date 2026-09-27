import { LLMReasoningEvaluator } from "../evaluation/LLMReasoningEvaluator.js";

describe("LLMReasoningEvaluator", () => {
  test("falls back to a labelled stub when no API key is configured", async () => {
    const evaluator = new LLMReasoningEvaluator({ apiKey: "" });
    const result = await evaluator.evaluate(
      { title: "t", summary: "s", requirements: [], constraints: [] },
      { contentSnapshot: { explanation: "x", diagram: "" } }
    );
    expect(result.qualitative.rawModelUsed).toBe("stub");
    expect(result.qualitative.score).toBeGreaterThanOrEqual(0);
  });

  test("_safeParseJSON recovers JSON embedded in extra text", () => {
    const evaluator = new LLMReasoningEvaluator({ apiKey: "irrelevant" });
    const parsed = evaluator._safeParseJSON('Here is the result:\n{"score": 70}\nThanks!');
    expect(parsed).toEqual({ score: 70 });
  });

  test("_safeParseJSON returns null for unparseable text (failure edge case)", () => {
    const evaluator = new LLMReasoningEvaluator({ apiKey: "irrelevant" });
    expect(evaluator._safeParseJSON("not json at all")).toBeNull();
  });

  test("_clampScore clamps out-of-range and non-numeric values", () => {
    const evaluator = new LLMReasoningEvaluator({ apiKey: "irrelevant" });
    expect(evaluator._clampScore(150)).toBe(100);
    expect(evaluator._clampScore(-10)).toBe(0);
    expect(evaluator._clampScore("not a number")).toBe(0);
  });
});
