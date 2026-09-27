# LLD Practice Platform

A small MERN prototype for practicing Low-Level Design: choose a problem,
design it (explanation + Mermaid class diagram), submit, get feedback split
into deterministic concept-coverage checks and AI (Gemini) reasoning
feedback, and review attempt history to try again.

See also: [`docs/RESEARCH_NOTE.md`](docs/RESEARCH_NOTE.md),
[`docs/DESIGN_NOTE.md`](docs/DESIGN_NOTE.md), [`AI_USAGE.md`](AI_USAGE.md).

## Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Frontend**: React (Vite), react-router, mermaid.js for diagram preview
- **AI evaluation**: Google Gemini API (`gemini-1.5-flash` by default, free tier)
- **Tests**: Jest + Supertest + mongodb-memory-server

## Project layout

```
backend/
  server.js                 entry point
  src/app.js                express app (routes + middleware), importable by tests
  src/models/                Problem, Attempt, Submission, Feedback (Mongoose schemas)
  src/evaluation/             EvaluationStrategy interface + 2 implementations + composite + queue
  src/routes/                 problems, attempts, submissions
  src/seed/seedProblems.js    seeds 4 sample LLD problems
  src/tests/                  unit + integration tests
frontend/
  src/pages/                  ProblemList, Workspace, History
  src/components/              NameGate (local learner id), MermaidPreview
  src/api/client.js            thin fetch wrapper
docs/
  RESEARCH_NOTE.md, DESIGN_NOTE.md
```

## Running it locally

### 1. Prerequisites
- Node.js 18+
- A local MongoDB instance (or a free MongoDB Atlas connection string)
- (Optional, recommended) a free Gemini API key from https://aistudio.google.com/apikey
  — without one, the app still runs end-to-end using a clearly-labelled
  stub qualitative response instead of a real LLM call.

### 2. Backend

```bash
cd backend
cp .env.example .env       # fill in MONGO_URI and GEMINI_API_KEY
npm install
npm run seed                # loads 4 sample problems into the DB
npm run dev                 # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api to :5000
```

Open http://localhost:5173, enter a name (no password — see Design Note
for why), pick a problem, write your design, submit, and watch feedback
arrive within a couple seconds.

### 4. Tests

```bash
cd backend
npm test
```

Note: the integration test uses `mongodb-memory-server`, which downloads a
small MongoDB binary the *first* time you run it (needs internet access
once; cached afterward). Unit tests (`deterministicEvaluator.test.js`,
`llmEvaluator.test.js`) have no such dependency.

## Key decisions (short version — full reasoning in DESIGN_NOTE.md)

- **Attempt vs. Submission are separate models**: Attempt is a live,
  autosaved draft; Submission is an immutable snapshot with its own
  evaluation lifecycle. This is what makes "try again" a clean new record
  instead of overwriting graded history.
- **Evaluation is a Strategy pattern** (`EvaluationStrategy` →
  `DeterministicChecklistEvaluator` + `LLMReasoningEvaluator`, combined by
  `CompositeEvaluator`), specifically so a new evaluation approach or a new
  submission format (e.g. real code instead of a diagram) can be added as
  one new class, with zero changes to routes or the queue.
- **Evaluation is asynchronous but deliberately simple**: an in-process
  queue with retries, not a message broker — submitting returns
  immediately, the frontend polls for status, and failures are visible and
  bounded (`EVAL_MAX_RETRIES`) instead of retrying forever.

## Limitations (be upfront about these)

- No authentication — a learner is identified by a name stored in
  `localStorage`, which is fine for a solo-practice MVP but not a real
  identity boundary.
- The in-process evaluation queue serializes one submission at a time; it
  would need a real queue (BullMQ/SQS) + multiple workers to scale.
- Only 4 seed problems, each with a hand-authored `expectedConcepts`
  checklist; adding problems is just adding data, not code, but someone
  still has to author that data per problem.
- Deterministic scoring is a coverage heuristic (keyword/substring
  presence), not a real parser of the Mermaid diagram — it's intentionally
  simple, and the qualitative (LLM) score is where actual design judgment
  lives.
