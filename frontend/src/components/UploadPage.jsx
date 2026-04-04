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
    if (f.size > 20 * 1024 * 1024)   { setError("File must be under 20 MB.");     return; }
    setError(""); setFile(f);
  }, []);

  const upload = async () => {
    if (!file) return;
    setLoading(true); setError(""); setProgress(15);
    try {
      const fd = new FormData();
      fd.append("file", file);
      setProgress(40);
      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      setProgress(85);
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Upload failed"); }
      const data = await res.json();
      setProgress(100);
      setTimeout(() => onDone({ text: data.text, name: file.name, docId: data.doc_id }), 350);
    } catch (e) { setError(e.message); setProgress(0); }
    finally     { setLoading(false); }
  };

  const fmt = (bytes) => bytes > 1024*1024
    ? `${(bytes/1024/1024).toFixed(1)} MB`
    : `${(bytes/1024).toFixed(0)} KB`;

  return (
    <div className="page">
      <div className="ambient"><div className="ambient-a"/><div className="ambient-b"/><div className="ambient-c"/></div>

      <div className="wrap up-layout">
        {/* Hero */}
        <div className="up-hero">
          <div className="up-eyebrow">
            <span className="tag tag-v">AI-Powered</span>
            <span className="tag tag-teal">Quiz Generator</span>
          </div>
          <h1 className="up-h1">
            Upload a PDF,<br/>
            <span className="grad-text">get a smart quiz</span>
          </h1>
          <p className="up-sub">
            Drop lecture notes, textbooks, or research papers.
            Our AI builds a tailored quiz from your content in seconds.
          </p>
          <div className="up-features">
            {["MCQ & Short answers", "Difficulty control", "Instant grading"].map(f => (
              <span key={f} className="up-feat">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--v2)" strokeWidth="1.5"/>
                  <path d="M5 8l2 2 4-4" stroke="var(--v2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Upload card */}
        <div className="up-card card">
          {/* Drop zone */}
          <div
            className={`dropzone ${dragging ? "dz-over" : ""} ${file ? "dz-filled" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
            onClick={() => !file && ref.current.click()}
          >
            <input ref={ref} type="file" accept="application/pdf" hidden
              onChange={e => pick(e.target.files[0])} />

            {file ? (
              <div className="dz-file">
                <div className="dz-file-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--v2)" strokeWidth="1.8" strokeLinecap="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="var(--v2)" strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="var(--v2)" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="var(--v2)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="dz-file-info">
                  <span className="dz-file-name">{file.name}</span>
                  <span className="dz-file-size">{fmt(file.size)} · PDF</span>
                </div>
                <button className="dz-remove" onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="dz-prompt">
                <div className="dz-icon-ring">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="dz-p1">Drop your PDF here</p>
                <p className="dz-p2">or <span className="dz-link" onClick={e => { e.stopPropagation(); ref.current.click(); }}>browse files</span> · max 20 MB</p>
              </div>
            )}
          </div>

          {/* Progress */}
          {progress > 0 && (
            <div className="up-progress">
              <div className="up-prog-bar"><div className="up-prog-fill" style={{ width: `${progress}%` }}/></div>
              <span className="up-prog-label">{progress < 100 ? "Extracting text from PDF…" : "Done!"}</span>
            </div>
          )}

          {error && <div className="err-box">{error}</div>}

          <button className="btn btn-primary" onClick={upload} disabled={!file || loading}>
            {loading ? <><span className="spin"/>&nbsp;Processing…</> : "Extract & Continue →"}
          </button>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
.up-layout {
  max-width: 1020px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
  padding-top: 3rem;
}
@media (max-width: 760px) { .up-layout { grid-template-columns: 1fr; gap: 2.5rem; padding-top: 1rem; } }

.up-hero { display: flex; flex-direction: column; gap: 1.25rem; }

.up-eyebrow { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.up-h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700; line-height: 1.12;
}

.up-sub { font-size: 1rem; color: var(--t2); line-height: 1.7; max-width: 380px; }

.up-features { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem; }
.up-feat {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.875rem; color: var(--t2);
}

/* Card */
.up-card { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

/* Drop zone */
.dropzone {
  border: 2px dashed var(--border-h);
  border-radius: var(--r);
  padding: 2.25rem 1.5rem;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.22s;
  background: rgba(255,255,255,0.015);
  min-height: 148px;
}
.dropzone:hover, .dz-over {
  border-color: var(--v); background: rgba(124,110,247,0.05);
}
.dz-filled { border-style: solid; border-color: rgba(124,110,247,0.4); cursor: default; }

.dz-prompt { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }

.dz-icon-ring {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(124,110,247,0.1); border: 1px solid rgba(124,110,247,0.2);
  display: flex; align-items: center; justify-content: center;
  color: var(--v2); margin-bottom: 0.25rem;
}

.dz-p1 { font-size: 0.975rem; font-weight: 600; color: var(--text); }
.dz-p2 { font-size: 0.82rem; color: var(--muted); }
.dz-link { color: var(--v2); font-weight: 500; cursor: pointer; }
.dz-link:hover { text-decoration: underline; }

.dz-file { display: flex; align-items: center; gap: 1rem; width: 100%; }

.dz-file-icon {
  width: 48px; height: 48px; border-radius: 10px;
  background: rgba(124,110,247,0.1); border: 1px solid rgba(124,110,247,0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.dz-file-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }
.dz-file-name { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dz-file-size { font-size: 0.75rem; color: var(--muted); }

.dz-remove {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid var(--border-h); background: var(--surface);
  color: var(--muted); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s;
}
.dz-remove:hover { border-color: var(--bad); color: var(--bad); }

/* Progress */
.up-progress { display: flex; flex-direction: column; gap: 0.45rem; }
.up-prog-bar { height: 4px; background: var(--border); border-radius: 100px; overflow: hidden; }
.up-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--v) 0%, var(--teal) 100%);
  border-radius: 100px; transition: width 0.4s ease;
}
.up-prog-label { font-size: 0.75rem; color: var(--muted); }
`;