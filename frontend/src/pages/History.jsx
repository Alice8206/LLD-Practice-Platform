import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";

export default function History({ learnerId }) {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getProblem(problemId), api.listAttempts(problemId, learnerId)])
      .then(([p, a]) => {
        setProblem(p);
        setAttempts(a);
      })
      .catch((err) => setError(err.message));
  }, [problemId, learnerId]);

  if (error) return <div className="page error-banner">{error}</div>;
  if (!problem || !attempts) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <Link to={`/problems/${problemId}`} className="back-link">
        ← Back to workspace
      </Link>
      <p className="eyebrow">PRACTICE HISTORY</p>
      <h1>Your attempts</h1>
      <p className="subtitle">A record of your design iterations for {problem.title}.</p>
      {attempts.length === 0 && <div className="empty-state"><strong>No attempts yet</strong><p>Start a design to begin building your practice history.</p><Link to={`/problems/${problemId}`} className="history-link">Go to workspace →</Link></div>}
      <div className="history-list">
        {attempts.map((a) => (
          <div key={a._id} className="history-row">
            <div>
                <strong>Attempt #{a.attemptNumber}</strong>
                <span className={`status-pill status-${a.status}`}>{a.status}</span>
            </div>
            <div className="history-meta">{new Date(a.createdAt).toLocaleString()}</div>
            <Link to={`/problems/${problemId}`} className="attempt-link">Open workspace <span aria-hidden="true">→</span></Link>
          </div>
        ))}
      </div>
      <p className="hint">
        Improvement shows up across attempts, not within one — that's the point of the practice loop. Try the same
        problem again after reading your feedback.
      </p>
    </div>
  );
}
