import { EvaluationStrategy } from "./EvaluationStrategy.js";

/**
 * LLMReasoningEvaluator
 *
 * Handles the part of evaluation that is genuinely ambiguous: "there can be
 * more than one valid LLD solution". A deterministic checklist cannot judge
 * whether responsibilities are well-separated, whether an abstraction will
 * bend or break under a plausible new requirement, or whether a chosen
 * pattern is a good fit vs. over-engineering. That's a reasoning task, so
 * it's delegated to an LLM (Gemini) with a prompt that asks it to reason
 * like a strict-but-fair LLD reviewer and return structured JSON.
 *
 * Reliability notes (per the assignment's "what if evaluation is slow or
 * fails" question):
 *  - A hard timeout (EVAL_TIMEOUT_MS) aborts the call rather than hanging.
 *  - If GEMINI_API_KEY is unset, this evaluator returns a clearly-labelled
 *    stub instead of failing, so the whole app still runs end-to-end.
 *  - Any thrown error is left to the caller (CompositeEvaluator /
 *    evaluationQueue) to retry or mark the submission as failed — this
 *    class does not swallow errors itself, so failures stay visible.
 */
export class LLMReasoningEvaluator extends EvaluationStrategy {
  constructor({ apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || "gemini-1.5-flash", timeoutMs = Number(process.env.EVAL_TIMEOUT_MS) || 15000 } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  buildPrompt(problem, submission) {
    return `You are a strict but fair Low-Level Design (LLD) reviewer.
There is more than one valid design for this problem — do not penalize a
design just for differing from a single "reference" solution. Judge it on
LLD fundamentals instead: clear responsibilities, sensible abstractions
(classes/interfaces), reasonable relationships, appropriate use (or
deliberate non-use) of design patterns, and extensibility.

PROBLEM: ${problem.title}
SUMMARY: ${problem.summary}
REQUIREMENTS:
${problem.requirements.map((r) => `- ${r}`).join("\n")}
CONSTRAINTS:
${(problem.constraints || []).map((c) => `- ${c}`).join("\n")}

LEARNER'S EXPLANATION:
${submission.contentSnapshot.explanation || "(none provided)"}

LEARNER'S MERMAID CLASS DIAGRAM:
${submission.contentSnapshot.diagram || "(none provided)"}

Return ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "score": <integer 0-100>,
  "strengths": [<string>, ...up to 4],
  "improvements": [<string>, ...up to 4, each concrete and actionable],
  "solidNotes": <string, 1-3 sentences on SOLID/responsibility issues if any>,
  "extensibilityNotes": <string, 1-2 sentences on how well this would survive a plausible new requirement>,
  "summary": <string, 2-3 sentence overall verdict>
}`;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async evaluate(problem, submission) {
    if (!this.isConfigured()) {
      return this._stubResult("GEMINI_API_KEY not set — returning a stub qualitative report so the flow still works end-to-end.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: this.buildPrompt(problem, submission) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
      const parsed = this._safeParseJSON(text);

      if (!parsed) throw new Error("Gemini response was not valid JSON");

      return {
        qualitative: {
          score: this._clampScore(parsed.score),
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          solidNotes: parsed.solidNotes || "",
          extensibilityNotes: parsed.extensibilityNotes || "",
          rawModelUsed: this.model,
        },
        summary: parsed.summary || "",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  _safeParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  _clampScore(score) {
    const n = Number(score);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  _stubResult(reason) {
    return {
      qualitative: {
        score: 60,
        strengths: ["Attempt was submitted with an explanation and/or diagram."],
        improvements: [reason, "Configure GEMINI_API_KEY to get real reasoning-based feedback."],
        solidNotes: "Not evaluated (stub mode).",
        extensibilityNotes: "Not evaluated (stub mode).",
        rawModelUsed: "stub",
      },
      summary: "Stubbed qualitative feedback — no LLM API key configured.",
    };
  }
}

export default LLMReasoningEvaluator;
