import { NavLink, Route, Routes } from "react-router-dom";
import NameGate, { useLearnerId } from "./components/NameGate.jsx";
import ProblemList from "./pages/ProblemList.jsx";
import Workspace from "./pages/Workspace.jsx";
import History from "./pages/History.jsx";

export default function App() {
  const [learnerId, setLearnerId] = useLearnerId();

  if (!learnerId) return <NameGate onSet={setLearnerId} />;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <NavLink to="/" className="brand"><span className="brand-mark">L</span><span>LLD Practice<small>DESIGN STUDIO</small></span></NavLink>
        <nav className="top-nav" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Problems</NavLink>
          <span className="learner-name"><span className="avatar">{learnerId.charAt(0).toUpperCase()}</span><span>Practicing as <strong>{learnerId}</strong></span></span>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<ProblemList />} />
        <Route path="/problems/:problemId" element={<Workspace learnerId={learnerId} />} />
        <Route path="/problems/:problemId/history" element={<History learnerId={learnerId} />} />
      </Routes>
    </div>
  );
}
