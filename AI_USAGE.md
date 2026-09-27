# AI Usage

This project was built with Claude as a pair-programmer. Below are the
meaningful decisions where AI input actually changed the design, not just
sped up typing.

## 1. Splitting `Attempt` and `Submission` into two models

**What AI suggested:** initially I was going to store everything on one
`Attempt` document (content + status + evaluation result) and just add an
`evaluationStatus` field to it. When asked to think through "what happens
on try-again / resubmission," the AI pointed out that this conflates a
*mutable draft* with an *immutable graded record* — editing a draft after
submission would either be blocked awkwardly or silently invalidate past
feedback.

**What I accepted:** split into `Attempt` (draft, autosaved) and
`Submission` (frozen snapshot, owns the evaluation lifecycle). This is
reflected in the domain model in `DESIGN_NOTE.md`.

**What I rejected/adjusted:** the AI's first pass had `Submission`
reference the live `Attempt` for its content instead of storing a
`contentSnapshot`. I rejected that — if the learner started a new attempt
before evaluation finished, the submission's displayed content could drift
from what was actually graded. I asked for an explicit snapshot field
instead.

## 2. How to split deterministic vs. LLM evaluation

**What AI suggested:** the first draft suggested letting the LLM do
*everything*, including checking whether required entities/relationships
were present, since "the LLM can just read the diagram too."

**What I rejected and why:** this seemed wasteful and less trustworthy for
the coverage-checking part specifically — checking "does the text mention
ParkingSpot" doesn't need judgment, it needs a substring match, and doing
it deterministically means that part of the feedback is instant, free, and
never hallucinated. I pushed back and asked for a clean split: deterministic
checklist evaluator for coverage, LLM evaluator only for genuinely
ambiguous judgment (responsibility separation, extensibility, SOLID). This
became the two-evaluator Strategy pattern.

## 3. Making the evaluator extensible via an interface, not a switch statement

**What AI suggested:** a `evaluateSubmission(submission, type)` function
with an `if/else` or `switch` on evaluation type.

**What I accepted instead:** when I asked specifically about the
assignment's question — "how would your design accommodate another
evaluation approach later" — the AI proposed an `EvaluationStrategy`
abstract class with a `CompositeEvaluator` that just iterates an array of
strategies. I took this because it directly answers the extensibility
question with a concrete mechanism (add a class, push it into an array)
rather than a promise that "the code is flexible."

## 4. Async evaluation: queue vs. synchronous request

**What AI suggested:** several options were discussed — synchronous
evaluation (block the HTTP request until the LLM responds), a real message
broker (BullMQ/Redis), or a simple in-process queue with retries.

**What I accepted:** the in-process queue. The assignment explicitly warns
against turning this into a distributed-systems project, and a blocking
synchronous call would make the API hang for however long Gemini takes
(and fail the whole request on a transient error). The AI's suggested
retry-with-cap-then-mark-failed pattern (`EVAL_MAX_RETRIES`) gave a
concrete, small way to demonstrate "what happens when evaluation fails"
without real infrastructure.

**What I adjusted:** I asked for the retry/queue mechanism to be isolated
behind a single `enqueue(submissionId)` function so that swapping it for a
real queue later wouldn't touch routes or controllers — this is called out
explicitly as a comment in `evaluationQueue.js` and in the design note's
"light HLD" section.

## 5. Gemini prompt: forcing structured JSON output and handling malformed responses

**What AI suggested:** the first prompt draft asked Gemini to "give
feedback on this design" in free text, which I'd then have to parse loosely.

**What I changed:** I asked the AI to constrain the prompt to explicitly
request only-JSON output matching a fixed schema (score/strengths/
improvements/solidNotes/extensibilityNotes/summary), and to add a
`_safeParseJSON` fallback that also tries to extract a JSON object embedded
in extra text, in case the model still wraps its answer in prose or
markdown fences. This came from AI-suggested practical experience with
LLM APIs not perfectly respecting `responseMimeType: "application/json"`
in every case — I kept the fallback since it's cheap insurance and it's
directly unit-tested in `llmEvaluator.test.js`.

## What I did *not* take from AI suggestions

- Authentication: the AI suggested a basic JWT-based login system at one
  point; I explicitly scoped that out since the assignment is about LLD,
  not building an auth system, and a name-only local identity is enough to
  demonstrate the practice loop.
- A drag-and-drop UML diagram editor library: suggested as a "nicer UX"
  option, but it would have eaten most of the two-day budget on a UI
  library integration rather than on the domain design the assignment
  actually weights (25% LLD/domain design vs. 10% implementation quality).
  Mermaid text input was kept instead.
