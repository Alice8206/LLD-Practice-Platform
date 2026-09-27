import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });

let renderCounter = 0;

/**
 * Renders learner-authored mermaid source into an SVG preview. Rendering
 * failures (invalid syntax while typing) are shown inline instead of
 * crashing the page — the learner is mid-diagram, malformed syntax is
 * expected and normal.
 */
export default function MermaidPreview({ source }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!source?.trim()) {
        setError(null);
        if (containerRef.current) containerRef.current.innerHTML = "";
        return;
      }
      try {
        renderCounter += 1;
        const id = `mmd-${renderCounter}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not render diagram");
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <div className="mermaid-preview">
      {error && <div className="mermaid-error" role="status"><strong>Diagram syntax needs attention</strong><span>The preview could not render this Mermaid diagram. Check the class and relationship syntax, then try again.</span><small>{error}</small></div>}
      <div ref={containerRef} />
    </div>
  );
}
