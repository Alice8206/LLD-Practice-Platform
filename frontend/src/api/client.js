const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  listProblems: () => request("/problems"),
  getProblem: (id) => request(`/problems/${id}`),

  startAttempt: (problemId, learnerId) =>
    request("/attempts", { method: "POST", body: JSON.stringify({ problemId, learnerId }) }),
  getAttempt: (id) => request(`/attempts/${id}`),
  saveAttempt: (id, content) => request(`/attempts/${id}`, { method: "PUT", body: JSON.stringify(content) }),
  listAttempts: (problemId, learnerId) =>
    request(`/attempts?problemId=${problemId}&learnerId=${encodeURIComponent(learnerId)}`),

  submitAttempt: (attemptId) => request("/submissions", { method: "POST", body: JSON.stringify({ attemptId }) }),
  getSubmission: (id) => request(`/submissions/${id}`),
};

export default api;
