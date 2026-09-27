import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

export default function ProblemList() {
  const [problems, setProblems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listProblems().then(setProblems).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page error-banner">Could not load problems: {error}</div>;
  if (!problems) return <div className="page">Loading problems…</div>;

  return (
    <div className="page">
      <div className="page-intro">
        <div><p className="eyebrow">YOUR PRACTICE SPACE</p><h1>Choose a problem</h1>
          <p className="subtitle">Build thoughtful systems, one design at a time.</p></div>
        <div className="intro-note"><span className="intro-icon">✳</span><span><strong>Practice the fundamentals</strong><small>Reason about trade-offs. Get actionable feedback.</small></span></div>
      </div>
      <div className="section-heading"><div><h2>Problem library</h2><p>Choose a prompt to start designing.</p></div><span className="problem-count">{problems.length} problems</span></div>
      <div className="problem-grid">
        {problems.map((p, index) => (
          <Link key={p._id} to={`/problems/${p._id}`} className="problem-card">
            <div className="problem-card-top">
              <span className={`difficulty difficulty-${p.difficulty}`}>{p.difficulty}</span>
              <span className="problem-index">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h2>{p.title}</h2>
            <p>{p.summary}</p>
            <div className="tags">
              {p.tags?.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
            <div className="card-action"><span>Start designing</span><span aria-hidden="true">↗</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
