import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const DIFFS = [
  { id:"easy",   label:"Easy",   icon:"🌱", sub:"Recall & recognition" },
  { id:"medium", label:"Medium", icon:"⚡", sub:"Understanding & apply" },
  { id:"hard",   label:"Hard",   icon:"🔬", sub:"Analysis & evaluation" },
];

const TYPES = [
  { id:"mcq",   label:"Multiple Choice",  sub:"4 options per question",   icon:"◉" },
  { id:"short", label:"Short Answer",     sub:"Open-ended responses",      icon:"✎" },
  { id:"mixed", label:"Mixed",            sub:"50% MCQ · 50% short",       icon:"⊞" },
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
        body: JSON.stringify({
          doc_id: docId, text: extractedText,
          num_questions: count, difficulty: diff,
          question_type: type, mode: type,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Generation failed"); }
      const data = await res.json();
      onQuizGenerated(data.questions);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page cfg-page">
      <div className="glow"><div className="glow-a"/><div className="glow-b"/></div>

      <div className="wrap cfg-wrap">
        {/* Header row */}
        <div className="cfg-topbar">
          <button className="btn btn-ghost" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <div className="cfg-breadcrumb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--ind3)" strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="14,2 14,8 20,8" stroke="var(--ind3)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span>{fileName}</span>
          </div>
        </div>

        <div className="cfg-heading">
          <h2 className="cfg-title">Configure your quiz</h2>
          <p className="cfg-sub">Choose how the AI structures and weights your questions.</p>
        </div>

        {/* 3-panel grid */}
        <div className="cfg-grid">

          {/* Panel 1 — count */}
          <div className="cfg-panel card-elevated">
            <div className="cfg-panel-label">
              <span>Question count</span>
              <span className="cfg-panel-value">{count}</span>
            </div>
            <input
              type="range" className="slider" min={3} max={20} value={count}
              onChange={e => setCount(+e.target.value)}
            />
            <div className="slider-scale">
              {[3,5,8,10,15,20].map(n => (
                <span key={n} className={count===n?"s-active":"s-tick"}>{n}</span>
              ))}
            </div>
            <div className="count-viz">
              {Array.from({length: Math.min(count, 20)}).map((_, i) => (
                <div key={i} className={`count-dot ${i < count ? "filled" : ""}`}/>
              ))}
            </div>
          </div>

          {/* Panel 2 — difficulty */}
          <div className="cfg-panel card-elevated">
            <div className="cfg-panel-label"><span>Difficulty level</span></div>
            <div className="diff-list">
              {DIFFS.map(d => (
                <button
                  key={d.id}
                  className={`diff-item ${diff===d.id ? "diff-sel" : ""}`}
                  onClick={() => setDiff(d.id)}
                >
                  <span className="diff-icon">{d.icon}</span>
                  <div className="diff-text">
                    <span className="diff-label">{d.label}</span>
                    <span className="diff-sub">{d.sub}</span>
                  </div>
                  <span className="diff-radio">
                    {diff===d.id && <span className="diff-radio-dot"/>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Panel 3 — type */}
          <div className="cfg-panel card-elevated">
            <div className="cfg-panel-label"><span>Question type</span></div>
            <div className="type-list">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`type-item ${type===t.id ? "type-sel" : ""}`}
                  onClick={() => setType(t.id)}
                >
                  <span className="type-icon">{t.icon}</span>
                  <div className="type-text">
                    <span className="type-label">{t.label}</span>
                    <span className="type-sub">{t.sub}</span>
                  </div>
                  {type===t.id && (
                    <svg className="type-check" width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l4 4 6-6" stroke="var(--ind3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Document preview */}
        <div className="cfg-preview card">
          <div className="cfg-preview-header">
            <span className="cfg-preview-label">Document preview</span>
            <span className="tag tag-neu">{Math.round(extractedText?.length / 5)} words approx.</span>
          </div>
          <p className="cfg-preview-text">
            {extractedText?.slice(0, 320)}{extractedText?.length > 320 ? "…" : ""}
          </p>
        </div>

        {error && <div className="err-box">{error}</div>}

        <button className="btn btn-primary cfg-cta" onClick={generate} disabled={loading}>
          {loading
            ? <><span className="spin"/>Generating {count} questions…</>
            : <>Generate {count} Questions <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></>
          }
        </button>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
.cfg-page { padding-top: 3rem; }

.cfg-wrap {
  max-width: 900px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.75rem;
}

.cfg-topbar {
  display: flex; align-items: center; justify-content: space-between;
}

.cfg-breadcrumb {
  display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.78rem; color: var(--t2);
  border: 1px solid var(--border); border-radius: var(--r3);
  padding: 0.3rem 0.75rem;
  max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.cfg-heading { display: flex; flex-direction: column; gap: 0.35rem; }
.cfg-title {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  font-weight: 400; letter-spacing: -0.02em;
}
.cfg-sub { font-size: 0.9rem; color: var(--t2); }

/* 3-panel grid */
.cfg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 700px) { .cfg-grid { grid-template-columns: 1fr; } }

.cfg-panel { padding: 1.4rem; display: flex; flex-direction: column; gap: 1rem; }

.cfg-panel-label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.75rem; font-weight: 600; color: var(--t2);
  text-transform: uppercase; letter-spacing: 0.07em;
}
.cfg-panel-value {
  font-family: var(--font-display); font-style: italic;
  font-size: 1.6rem; color: var(--text); letter-spacing: -0.02em;
  -webkit-text-fill-color: var(--text);
}

/* Slider */
.slider {
  -webkit-appearance: none; width: 100%; height: 2px;
  background: var(--border2); border-radius: 100px; outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px;
  background: var(--ind2); border-radius: 50%; cursor: pointer;
  border: 2px solid var(--bg3);
  box-shadow: 0 0 0 3px rgba(91,91,214,0.25);
}
.slider-scale { display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--t3); }
.s-active { color: var(--ind3); font-weight: 700; }

/* Count visualiser */
.count-viz { display: flex; flex-wrap: wrap; gap: 4px; }
.count-dot {
  width: 8px; height: 8px; border-radius: 2px;
  background: var(--border2); transition: background 0.2s;
}
.count-dot.filled { background: var(--ind); }

/* Difficulty */
.diff-list { display: flex; flex-direction: column; gap: 0.5rem; }
.diff-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.7rem 0.85rem; border-radius: var(--r3);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; transition: all 0.18s; cursor: pointer;
}
.diff-item:hover { border-color: var(--border2); background: var(--surface2); }
.diff-sel { border-color: var(--ind) !important; background: rgba(91,91,214,0.08) !important; }

.diff-icon { font-size: 1.1rem; flex-shrink: 0; width: 22px; text-align: center; }
.diff-text { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.diff-label { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.diff-sub   { font-size: 0.7rem; color: var(--t2); }

.diff-radio {
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid var(--border2); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.diff-sel .diff-radio { border-color: var(--ind2); background: rgba(91,91,214,0.2); }
.diff-radio-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ind2); }

/* Type */
.type-list { display: flex; flex-direction: column; gap: 0.5rem; }
.type-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.7rem 0.85rem; border-radius: var(--r3);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; transition: all 0.18s; cursor: pointer;
}
.type-item:hover { border-color: var(--border2); background: var(--surface2); }
.type-sel { border-color: var(--ind) !important; background: rgba(91,91,214,0.08) !important; }

.type-icon  { font-size: 1rem; width: 22px; text-align: center; flex-shrink: 0; color: var(--t2); }
.type-text  { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.type-label { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.type-sub   { font-size: 0.7rem; color: var(--t2); }
.type-check { flex-shrink: 0; margin-left: auto; }

/* Preview */
.cfg-preview { padding: 1.25rem 1.4rem; display: flex; flex-direction: column; gap: 0.65rem; }
.cfg-preview-header { display: flex; align-items: center; justify-content: space-between; }
.cfg-preview-label { font-size: 0.7rem; font-weight: 600; color: var(--t2); text-transform: uppercase; letter-spacing: 0.08em; }
.cfg-preview-text { font-size: 0.82rem; color: var(--t2); line-height: 1.7; max-height: 68px; overflow: hidden; }

.cfg-cta { max-width: 340px; align-self: flex-start; }
`;