import { useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function UploadPage({ onDone }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState("");
  const ref = useRef();

  const pick = useCallback((f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
    if (f.size > 20 * 1024 * 1024)   { setError("File must be under 20 MB."); return; }
    setError(""); setFile(f);
  }, []);

  const upload = async () => {
    if (!file) return;
    setLoading(true); setError(""); setProgress(10);
    try {
      const fd = new FormData();
      fd.append("file", file);
      setProgress(35);
      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      setProgress(80);
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Upload failed"); }
      const data = await res.json();
      setProgress(100);
      setTimeout(() => onDone({ text: data.text, name: file.name, docId: data.doc_id }), 400);
    } catch (e) { setError(e.message); setProgress(0); setLoading(false); }
  };

  const fmt = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

  return (
    <div className="page up-page">
      <div className="glow"><div className="glow-a"/><div className="glow-b"/></div>

      <div className="wrap up-wrap">
        {/* Left — hero copy */}
        <div className="up-hero">
          <div className="up-kicker">
            <span className="kicker-dot"/>
            <span>AI-Powered Assessment Tool</span>
          </div>

          <h1 className="up-h1">
            Turn any document<br/>
            into a <em className="up-em">smart quiz</em>
          </h1>

          <p className="up-desc">
            Upload lecture notes, textbooks, or research papers.
            EduQuiz analyses the content and generates tailored
            questions with automatic grading in seconds.
          </p>

          <div className="up-stats">
            {[
              { n: "MCQ", d: "Multiple choice" },
              { n: "Short", d: "Open-ended" },
              { n: "Mixed", d: "50 / 50 split" },
            ].map(s => (
              <div key={s.n} className="up-stat">
                <span className="up-stat-n">{s.n}</span>
                <span className="up-stat-d">{s.d}</span>
              </div>
            ))}
          </div>

          <div className="up-checklist">
            {["Automatic grading with partial credit", "Difficulty levels: Easy · Medium · Hard", "Export quiz as PDF with or without answers"].map(t => (
              <div key={t} className="up-check">
                <span className="check-icon">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — upload card */}
        <div className="up-panel card-elevated">
          <div className="up-panel-header">
            <span className="up-panel-title">Upload document</span>
            <span className="tag tag-neu">PDF only</span>
          </div>

          {/* Drop zone */}
          <div
            className={`dropzone ${dragging ? "dz-over" : ""} ${file ? "dz-filled" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
            onClick={() => !file && ref.current.click()}
          >
            <input ref={ref} type="file" accept="application/pdf" hidden onChange={e => pick(e.target.files[0])} />

            {file ? (
              <div className="dz-file">
                <div className="dz-file-thumb">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="dz-file-meta">
                  <span className="dz-file-name">{file.name}</span>
                  <span className="dz-file-size">{fmt(file.size)}</span>
                </div>
                <button className="dz-remove" onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="dz-empty">
                <div className="dz-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="dz-title">Drop your PDF here</p>
                <p className="dz-sub">or <span className="dz-link" onClick={e => { e.stopPropagation(); ref.current.click(); }}>browse files</span> &nbsp;·&nbsp; Max 20 MB</p>
              </div>
            )}
          </div>

          {/* Progress */}
          {progress > 0 && (
            <div className="up-prog-wrap">
              <div className="up-prog-bar">
                <div className="up-prog-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="up-prog-txt">{progress < 100 ? `Extracting text… ${progress}%` : "Complete"}</span>
            </div>
          )}

          {error && <div className="err-box">{error}</div>}

          <button className="btn btn-primary" onClick={upload} disabled={!file || loading}>
            {loading ? <><span className="spin"/>Processing document…</> : "Extract & Continue →"}
          </button>

          <p className="up-footnote">
            Your document is processed locally and never stored permanently.
          </p>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
.up-page { padding-top: 4rem; }

.up-wrap {
  max-width: 1080px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 440px; gap: 5rem;
  align-items: center;
}
@media (max-width: 900px) { .up-wrap { grid-template-columns: 1fr; gap: 3rem; } }

/* Hero */
.up-hero { display: flex; flex-direction: column; gap: 1.75rem; }

.up-kicker {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.75rem; font-weight: 500; color: var(--t2);
  letter-spacing: 0.02em;
}
.kicker-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 8px rgba(61,214,140,0.5);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(61,214,140,0.5); }
  50%       { box-shadow: 0 0 16px rgba(61,214,140,0.8); }
}

.up-h1 {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 4.5vw, 3.6rem);
  font-weight: 400; line-height: 1.08;
  letter-spacing: -0.02em; color: var(--text);
}
.up-em {
  font-style: italic;
  background: linear-gradient(135deg, var(--ind3) 0%, #c0c0ff 50%, var(--ok) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.up-desc { font-size: 0.975rem; color: var(--t2); line-height: 1.75; max-width: 420px; }

.up-stats {
  display: flex; gap: 0; border: 1px solid var(--border);
  border-radius: var(--r2); overflow: hidden; width: fit-content;
}
.up-stat {
  padding: 0.75rem 1.25rem;
  display: flex; flex-direction: column; gap: 0.15rem;
  border-right: 1px solid var(--border);
}
.up-stat:last-child { border-right: none; }
.up-stat-n { font-size: 0.875rem; font-weight: 700; color: var(--text); }
.up-stat-d { font-size: 0.7rem; color: var(--t2); }

.up-checklist { display: flex; flex-direction: column; gap: 0.65rem; }
.up-check {
  display: flex; align-items: center; gap: 0.7rem;
  font-size: 0.85rem; color: var(--t2);
}
.check-icon {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  background: rgba(61,214,140,0.1); border: 1px solid rgba(61,214,140,0.2);
  display: flex; align-items: center; justify-content: center; color: var(--ok);
}

/* Panel */
.up-panel { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

.up-panel-header {
  display: flex; align-items: center; justify-content: space-between;
}
.up-panel-title { font-size: 0.875rem; font-weight: 600; color: var(--text); }

/* Drop zone */
.dropzone {
  border: 1.5px dashed var(--border2);
  border-radius: var(--r2);
  min-height: 140px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
  background: rgba(255,255,255,0.018);
  position: relative; overflow: hidden;
}
.dropzone::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(91,91,214,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.dropzone:hover, .dz-over {
  border-color: var(--ind2); background: rgba(91,91,214,0.04);
}
.dz-filled { border-style: solid; border-color: rgba(91,91,214,0.35); cursor: default; }

.dz-empty { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 1.5rem; }

.dz-icon {
  width: 48px; height: 48px; border-radius: 10px;
  background: rgba(91,91,214,0.1); border: 1px solid rgba(91,91,214,0.18);
  display: flex; align-items: center; justify-content: center;
  color: var(--ind3); margin-bottom: 0.25rem;
}

.dz-title { font-size: 0.9rem; font-weight: 600; color: var(--text); }
.dz-sub   { font-size: 0.78rem; color: var(--t2); }
.dz-link  { color: var(--ind3); font-weight: 500; cursor: pointer; }
.dz-link:hover { text-decoration: underline; }

.dz-file { display: flex; align-items: center; gap: 1rem; padding: 1rem; width: 100%; }

.dz-file-thumb {
  width: 42px; height: 42px; border-radius: var(--r3);
  background: rgba(91,91,214,0.12); border: 1px solid rgba(91,91,214,0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  color: var(--ind3);
}
.dz-file-meta { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }
.dz-file-name { font-size: 0.85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dz-file-size { font-size: 0.72rem; color: var(--t2); }

.dz-remove {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  border: 1px solid var(--border2); background: transparent; color: var(--t2);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s;
}
.dz-remove:hover { border-color: var(--bad); color: var(--bad); background: rgba(229,72,77,0.08); }

/* Progress */
.up-prog-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
.up-prog-bar  { height: 3px; background: var(--border); border-radius: 100px; overflow: hidden; }
.up-prog-fill {
  height: 100%; border-radius: 100px;
  background: linear-gradient(90deg, var(--ind) 0%, var(--ind3) 100%);
  transition: width 0.4s ease;
}
.up-prog-txt { font-size: 0.72rem; color: var(--t2); }

.up-footnote {
  font-size: 0.72rem; color: var(--t3); text-align: center; line-height: 1.5;
}
`;