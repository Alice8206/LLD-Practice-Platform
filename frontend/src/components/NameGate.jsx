import { useEffect, useState } from "react";

const STORAGE_KEY = "lld_learner_name";

/**
 * There's no user/auth system in this MVP (out of scope for an LLD-focused
 * assignment). We just need a stable identifier so a learner's attempt
 * history is theirs across visits. This asks for a name once and persists
 * it to localStorage.
 */
export function useLearnerId() {
  const [learnerId, setLearnerId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  useEffect(() => {
    if (learnerId) localStorage.setItem(STORAGE_KEY, learnerId);
  }, [learnerId]);

  return [learnerId, setLearnerId];
}

export default function NameGate({ onSet }) {
  const [value, setValue] = useState("");

  return (
    <div className="name-gate">
      <div className="name-gate-card">
        <h1>LLD Practice</h1>
        <p>What should we call you? This just keeps your attempt history yours — no account needed.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSet(value.trim());
          }}
        >
          <input
            autoFocus
            placeholder="e.g. Aditi"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit">Start practicing</button>
        </form>
      </div>
    </div>
  );
}
