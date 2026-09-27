import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import MermaidPreview from "../components/MermaidPreview.jsx";

const AUTOSAVE_DELAY_MS = 800;

export default function Workspace({ learnerId }) {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [diagram, setDiagram] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [submission, setSubmission] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimer = useRef(null);
  const pollTimer = useRef(null);

  // Load the problem and resume the most recent draft, or start a fresh attempt.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const p = await api.getProblem(problemId);
        if (cancelled) return;
        setProblem(p);

        const history = await api.listAttempts(problemId, learnerId);
        const draft = history.find((a) => a.status === "draft");
        const active = draft || (await api.startAttempt(problemId, learnerId));
        if (cancelled) return;
        setAttempt(active);
        setExplanation(active.content.explanation);
        setDiagram(active.content.diagram);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    init();
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
      clearInterval(pollTimer.current);
    };
  }, [problemId, learnerId]);

  // Debounced autosave whenever content changes.
  useEffect(() => {
    if (!attempt || attempt.status !== "draft") return;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveAttempt(attempt._id, { explanation, diagram });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explanation, diagram]);

  const canSubmit = useMemo(
    () => attempt?.status === "draft" && (explanation.trim() || diagram.trim()),
    [attempt, explanation, diagram]
  );

  async function handleSubmit() {
    if (isSubmitting || !canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      // Make sure the latest edits are saved before submitting.
      await api.saveAttempt(attempt._id, { explanation, diagram });
      const sub = await api.submitAttempt(attempt._id);
      setSubmission(sub);
      setAttempt({ ...attempt, status: "submitted" });
      pollForFeedback(sub._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function pollForFeedback(submissionId) {
    clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      const result = await api.getSubmission(submissionId);
      setSubmission(result.submission);
      if (result.submission.evaluationStatus === "completed") {
        setFeedback(result.feedback);
        clearInterval(pollTimer.current);
      } else if (result.submission.evaluationStatus === "failed") {
        clearInterval(pollTimer.current);
      }
    }, 1500);
  }

  async function handleTryAgain() {
    const fresh = await api.startAttempt(problemId, learnerId);
    setAttempt(fresh);
    setExplanation("");
    setDiagram("");
    setSubmission(null);
    setFeedback(null);
  }

  if (error) return <div className="page error-banner">{error}</div>;
  if (!problem || !attempt) return <div className="page">Loading…</div>;

  const isSubmitted = attempt.status === "submitted";

  return (
    <div className="page workspace">
      <div className="workspace-header">
        <div>
          <Link to="/" className="back-link">
            ← All problems
          </Link>
          <h1>{problem.title}</h1>
          <div className="workspace-meta"><span className={`difficulty difficulty-${problem.difficulty}`}>{problem.difficulty}</span>{problem.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
          <p className="workspace-summary">{problem.summary}</p>
        </div>
        <Link to={`/problems/${problemId}/history`} className="history-link">
          View attempt history
        </Link>
      </div>

      <div className="workspace-grid">
        <aside className="problem-panel">
          <div className="panel-kicker">THE BRIEF</div><h3>Requirements</h3>
          <ul>
            {problem.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {problem.constraints?.length > 0 && (
            <>
            <h3 className="constraint-heading">Constraints</h3>
              <ul>
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <div className="attempt-badge">Attempt #{attempt.attemptNumber}</div>
        </aside>

        <main className="editor-panel">
          <label className="editor-field">
            <span className="field-heading"><span><strong>Design reasoning</strong><small>Explain your approach and key trade-offs.</small></span><span className="field-type">NOTES</span></span>
            <textarea
              disabled={isSubmitted}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe your classes, their responsibilities, key relationships, and any trade-offs you made…"
              rows={10}
              className="reasoning-input"
            />
            <span className="character-count">{explanation.length} characters</span>
          </label>

          <label className="editor-field diagram-field">
            <span className="field-heading"><span><strong>Class diagram</strong><small>Map the classes and relationships in your design.</small></span><span className="language-badge">Mermaid</span></span>
            <textarea
              disabled={isSubmitted}
              value={diagram}
              onChange={(e) => setDiagram(e.target.value)}
              placeholder={"classDiagram\n  class ParkingLot\n  ParkingLot --> ParkingSpot"}
              rows={10}
              className="code-input"
            />
          </label>
          <MermaidPreview source={diagram} />

          <div className="workspace-actions">
            {!isSubmitted && <span className={`save-state save-${saveState}`}><span className="save-dot" />{saveState === "saving" ? "Saving changes" : "Draft saved"}</span>}
            {!isSubmitted && (
              <button className="primary-button" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
                {isSubmitting && <span className="spinner" />}{isSubmitting ? "Submitting…" : "Submit for feedback"}<span aria-hidden="true">→</span>
              </button>
            )}
            {isSubmitted && (
              <button className="secondary" onClick={handleTryAgain}>
                Try again (new attempt)
              </button>
            )}
          </div>

          {submission && <FeedbackPanel submission={submission} feedback={feedback} />}
        </main>
      </div>
    </div>
  );
}

function FeedbackPanel({ submission, feedback }) {
  if (submission.evaluationStatus === "pending" || submission.evaluationStatus === "processing") {
    return (
      <div className="feedback-panel pending">
        <span className="spinner" /> Evaluating your design — this usually takes a few seconds…
      </div>
    );
  }
  if (submission.evaluationStatus === "failed") {
    return (
      <div className="feedback-panel failed">
        Evaluation failed after retries: {submission.error}. Your submission is saved — you can try again shortly.
      </div>
    );
  }
  if (!feedback) return null;

  return (
    <div className="feedback-panel completed">
      <div className="score-row">
        <div className="score-big">{feedback.overallScore}</div>
        <div>
          <div className="score-label">Overall score</div>
          <div className="score-sub">
            Coverage {feedback.deterministic.score} · Reasoning {feedback.qualitative.score}
          </div>
        </div>
      </div>

      {feedback.summary && <p className="feedback-summary">{feedback.summary}</p>}

      <div className="feedback-columns">
        <div>
          <h4>Concept coverage (deterministic)</h4>
          <CoverageList label="Entities" items={feedback.deterministic.entityCoverage} />
          <CoverageList label="Relationships" items={feedback.deterministic.relationshipCoverage} />
          <CoverageList label="Patterns" items={feedback.deterministic.patternCoverage} />
          {feedback.deterministic.notes?.length > 0 && (
            <ul className="notes">
              {feedback.deterministic.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4>Design reasoning (AI)</h4>
          {feedback.qualitative.strengths?.length > 0 && (
            <>
              <p className="col-label">Strengths</p>
              <ul>
                {feedback.qualitative.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {feedback.qualitative.improvements?.length > 0 && (
            <>
              <p className="col-label">Improvements</p>
              <ul>
                {feedback.qualitative.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {feedback.qualitative.solidNotes && <p className="col-label">SOLID: <span className="plain">{feedback.qualitative.solidNotes}</span></p>}
          {feedback.qualitative.extensibilityNotes && (
            <p className="col-label">Extensibility: <span className="plain">{feedback.qualitative.extensibilityNotes}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

function CoverageList({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="coverage-group">
      <p className="col-label">{label}</p>
      <ul className="coverage-list">
        {items.map((item) => (
          <li key={item.name} className={item.found ? "found" : "missing"}>
            {item.found ? "✓" : "✗"} {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
