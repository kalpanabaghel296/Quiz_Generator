import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const DIFFS = [
  { id: "easy",   emoji: "🌱", label: "Easy",   desc: "Recall & recognition" },
  { id: "medium", emoji: "🧠", label: "Medium", desc: "Understanding & apply" },
  { id: "hard",   emoji: "🔥", label: "Hard",   desc: "Analysis & evaluation" },
];

const TYPES = [
  { id: "mcq",   label: "MCQ",          sub: "Multiple choice only",    tag: "tag-v" },
  { id: "short", label: "Short Answer", sub: "Open-ended writing",      tag: "tag-teal" },
  { id: "mixed", label: "Mixed",        sub: "50 % MCQ + 50 % short",   tag: "tag-pink" },
];

export default function ConfigPage({ extractedText, fileName, docId, onQuizGenerated, onBack }) {
  const [count, setCount]   = useState(5);
  const [diff, setDiff]     = useState("medium");
  const [type, setType]     = useState("mcq");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, text: extractedText, num_questions: count, difficulty: diff, question_type: type, mode: type }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Generation failed"); }
      const data = await res.json();
      onQuizGenerated(data.questions);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="ambient"><div className="ambient-a"/><div className="ambient-b"/><div className="ambient-c"/></div>

      <div className="wrap cfg-layout">
        {/* Top nav */}
        <div className="cfg-nav">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <div className="cfg-file-chip">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6z" stroke="var(--v2)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 2v4h4" stroke="var(--v2)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{fileName}</span>
          </div>
        </div>

        <div className="cfg-header">
          <h2 className="cfg-title">Configure your quiz</h2>
          <p className="cfg-sub">Shape how the AI builds your questions.</p>
        </div>

        {/* 3-column grid on desktop, stack on mobile */}
        <div className="cfg-grid">
          {/* --- Question count --- */}
          <div className="cfg-card card">
            <div className="cfg-card-label">Questions</div>
            <div className="cfg-count-display">
              <span className="cfg-count-big">{count}</span>
              <span className="cfg-count-unit">questions</span>
            </div>
            <input type="range" className="slider" min={3} max={20} value={count}
              onChange={e => setCount(+e.target.value)} />
            <div className="slider-ticks">
              {[3,5,8,10,15,20].map(n => <span key={n} className={count===n ? "tick-active" : "tick"}>{n}</span>)}
            </div>
          </div>

          {/* --- Difficulty --- */}
          <div className="cfg-card card">
            <div className="cfg-card-label">Difficulty</div>
            <div className="diff-group">
              {DIFFS.map(d => (
                <button key={d.id} className={`diff-btn ${diff===d.id ? "diff-active" : ""}`}
                  onClick={() => setDiff(d.id)}>
                  <span className="diff-emoji">{d.emoji}</span>
                  <span className="diff-label">{d.label}</span>
                  <span className="diff-desc">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* --- Type --- */}
          <div className="cfg-card card">
            <div className="cfg-card-label">Question type</div>
            <div className="type-group">
              {TYPES.map(t => (
                <button key={t.id} className={`type-btn ${type===t.id ? "type-active" : ""}`}
                  onClick={() => setType(t.id)}>
                  <div className="type-top">
                    <span className="type-label">{t.label}</span>
                    <span className={`tag ${t.tag}`}>{t.label === "Mixed" ? "50/50" : t.id.toUpperCase()}</span>
                  </div>
                  <span className="type-sub">{t.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text preview */}
        <div className="cfg-preview card">
          <span className="cfg-prev-label">Document preview</span>
          <p className="cfg-prev-text">
            {extractedText?.slice(0, 280)}{extractedText?.length > 280 ? "…" : ""}
          </p>
        </div>

        {error && <div className="err-box">{error}</div>}

        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? <><span className="spin"/> Generating {count} questions…</> : `Generate ${count} Questions →`}
        </button>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
.cfg-layout {
  max-width: 820px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.5rem;
  padding-top: 1.5rem;
}

.cfg-nav {
  display: flex; justify-content: space-between; align-items: center;
}

.cfg-file-chip {
  display: flex; align-items: center; gap: 0.45rem;
  padding: 0.3rem 0.85rem; border-radius: 100px;
  border: 1px solid var(--border); font-size: 0.78rem; color: var(--muted);
  max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.cfg-header { display: flex; flex-direction: column; gap: 0.3rem; }
.cfg-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.1rem); font-weight: 700;
}
.cfg-sub { color: var(--t2); font-size: 0.95rem; }

/* 3-col grid */
.cfg-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
}
@media (max-width: 700px) { .cfg-grid { grid-template-columns: 1fr; } }

.cfg-card {
  padding: 1.4rem; display: flex; flex-direction: column; gap: 1rem;
}

.cfg-card-label {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted);
}

/* Count */
.cfg-count-display { display: flex; align-items: baseline; gap: 0.4rem; }
.cfg-count-big {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.8rem; font-weight: 700;
  background: linear-gradient(135deg, var(--v2), var(--teal));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.cfg-count-unit { font-size: 0.8rem; color: var(--muted); }

/* Slider */
.slider {
  -webkit-appearance: none; width: 100%; height: 4px;
  background: var(--border-h); border-radius: 100px; outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px;
  background: linear-gradient(135deg, var(--v), var(--v2));
  border-radius: 50%; cursor: pointer;
  box-shadow: 0 0 0 3px rgba(124,110,247,0.2);
}
.slider-ticks { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--muted); }
.tick-active { color: var(--v2); font-weight: 700; }

/* Difficulty */
.diff-group { display: flex; flex-direction: column; gap: 0.5rem; }
.diff-btn {
  display: grid; grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.6rem;
  padding: 0.65rem 0.85rem; border-radius: var(--r2);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; transition: all 0.18s;
}
.diff-btn:hover { border-color: var(--border-h); background: var(--surface-h); }
.diff-active { border-color: var(--v) !important; background: rgba(124,110,247,0.08) !important; }
.diff-emoji { grid-row: 1 / 3; font-size: 1.3rem; display: flex; align-items: center; }
.diff-label { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.diff-desc  { font-size: 0.72rem; color: var(--muted); }

/* Type */
.type-group { display: flex; flex-direction: column; gap: 0.5rem; }
.type-btn {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 0.75rem 0.9rem; border-radius: var(--r2);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; transition: all 0.18s;
}
.type-btn:hover { border-color: var(--border-h); background: var(--surface-h); }
.type-active { border-color: var(--v) !important; background: rgba(124,110,247,0.08) !important; }
.type-top { display: flex; align-items: center; justify-content: space-between; }
.type-label { font-size: 0.875rem; font-weight: 600; color: var(--text); }
.type-sub   { font-size: 0.72rem; color: var(--muted); }

/* Preview */
.cfg-preview { padding: 1.25rem 1.4rem; display: flex; flex-direction: column; gap: 0.55rem; }
.cfg-prev-label {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted);
}
.cfg-prev-text {
  font-size: 0.82rem; color: var(--muted); line-height: 1.65;
  max-height: 72px; overflow: hidden;
}
`;