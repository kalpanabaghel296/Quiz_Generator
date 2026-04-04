import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function QuizPage({ questions, onSubmit, onBack }) {
  const [answers, setAnswers]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [modal, setModal]       = useState(false);
  const topRef = useRef();

  const set = (id, val) => setAnswers(p => ({ ...p, [id]: val }));

  const attempted = Object.values(answers).filter(v => v !== null && v !== undefined && v !== "").length;
  const pct = Math.round((attempted / questions.length) * 100);
  const blank = questions.length - attempted;

  const trySubmit = () => blank > 0 ? setModal(true) : doSubmit();

  const doSubmit = async () => {
    setModal(false); setLoading(true); setError("");
    const payload = questions.map(q => ({ id: q.id, answer: answers[q.id] ?? null }));
    try {
      const res = await fetch(`${API}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, answers: payload, allow_partial_marks: true }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Grading failed"); }
      onSubmit(await res.json());
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  };

  return (
    <div className="page qz-page">
      <div className="glow"><div className="glow-a"/><div className="glow-b"/></div>

      <div className="wrap qz-wrap" ref={topRef}>
        {/* Header */}
        <div className="qz-header">
          <button className="btn btn-ghost" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <div className="qz-progress-area">
            <div className="qz-prog-bar">
              <div className="qz-prog-fill" style={{ width: `${pct}%` }}/>
            </div>
          </div>

          <div className="qz-meta">
            <span className="tag tag-ind">{questions.length} Questions</span>
            <span className="qz-count">{attempted}/{questions.length} answered</span>
          </div>
        </div>

        <div className="qz-heading">
          <h2 className="qz-title">Answer the Questions</h2>
          <p className="qz-sub">Select or type your answers below. You can revisit any question before submitting.</p>
        </div>

        {/* Two-column layout: questions left, sidebar right */}
        <div className="qz-layout">
          <div className="qz-questions">
            {questions.map((q, i) => (
              <QCard key={q.id} q={q} idx={i} answer={answers[q.id]} onAnswer={v => set(q.id, v)} />
            ))}
          </div>

          {/* Sidebar */}
          <aside className="qz-sidebar">
            <div className="sidebar-card card-elevated">
              <div className="sidebar-title">Question map</div>
              <div className="q-map">
                {questions.map((q, i) => {
                  const ans = answers[q.id];
                  const done = ans !== null && ans !== undefined && ans !== "";
                  return (
                    <div
                      key={q.id}
                      className={`q-map-dot ${done ? "q-map-done" : ""}`}
                      title={`Q${i+1}`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>

              <div className="sidebar-divider divider"/>

              <div className="sidebar-stat">
                <div className="ss-row">
                  <span className="ss-label">Answered</span>
                  <span className="ss-val ok">{attempted}</span>
                </div>
                <div className="ss-row">
                  <span className="ss-label">Remaining</span>
                  <span className="ss-val muted">{blank}</span>
                </div>
                <div className="ss-row">
                  <span className="ss-label">Progress</span>
                  <span className="ss-val">{pct}%</span>
                </div>
              </div>

              <div className="sidebar-divider divider"/>

              {error && <div className="err-box" style={{marginBottom:"1rem"}}>{error}</div>}

              <button className="btn btn-primary" onClick={trySubmit} disabled={loading}>
                {loading ? <><span className="spin"/>Grading…</> : "Submit Quiz →"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal-box card-elevated" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="modal-title">{blank} question{blank > 1 ? "s" : ""} unanswered</h3>
            <p className="modal-body">
              Unanswered questions will receive a score of 0. You can continue reviewing or submit now.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" style={{flex:1}} onClick={() => setModal(false)}>Keep reviewing</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={doSubmit}>Submit anyway</button>
            </div>
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

function QCard({ q, idx, answer, onAnswer }) {
  const done = answer !== null && answer !== undefined && answer !== "";

  return (
    <div className={`qcard card-elevated ${done ? "qcard-done" : ""}`}>
      <div className="qcard-top">
        <div className="qcard-meta">
          <span className="qcard-num">Q{idx + 1}</span>
          <span className={`tag ${q.type === "mcq" ? "tag-ind" : "tag-ok"}`}>
            {q.type === "mcq" ? "Multiple Choice" : "Short Answer"}
          </span>
        </div>
        {done && (
          <div className="qcard-done-badge">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Answered
          </div>
        )}
      </div>

      <p className="qcard-q">{q.question}</p>

      {q.type === "mcq" ? (
        <div className="opts">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`opt ${answer === i ? "opt-sel" : ""}`}
              onClick={() => onAnswer(i)}
            >
              <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
              <span className="opt-text">{opt}</span>
              {answer === i && (
                <svg className="opt-tick" width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l4 4 6-6" stroke="var(--ind3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="field qcard-ta"
          placeholder="Write your answer here…"
          rows={3}
          value={answer || ""}
          onChange={e => onAnswer(e.target.value)}
        />
      )}
    </div>
  );
}

const css = `
.qz-page { padding-top: 2rem; }

.qz-wrap {
  max-width: 980px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.75rem;
}

/* Header */
.qz-header {
  display: flex; align-items: center; gap: 1rem;
  position: sticky; top: calc(56px + 0.75rem); z-index: 20;
  background: rgba(8,8,16,0.85); backdrop-filter: blur(16px);
  border: 1px solid var(--border); border-radius: var(--r);
  padding: 0.75rem 1rem;
}

.qz-progress-area { flex: 1; }
.qz-prog-bar { height: 3px; background: var(--border2); border-radius: 100px; overflow: hidden; }
.qz-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ind) 0%, var(--ind3) 100%);
  border-radius: 100px; transition: width 0.35s ease;
}

.qz-meta { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
.qz-count { font-size: 0.78rem; color: var(--t2); font-weight: 500; }

.qz-heading { display: flex; flex-direction: column; gap: 0.3rem; }
.qz-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 400; letter-spacing: -0.02em;
}
.qz-sub { font-size: 0.875rem; color: var(--t2); }

/* Two-column layout */
.qz-layout { display: grid; grid-template-columns: 1fr 240px; gap: 1.5rem; align-items: start; }
@media (max-width: 780px) { .qz-layout { grid-template-columns: 1fr; } .qz-sidebar { order: -1; } }

.qz-questions { display: flex; flex-direction: column; gap: 1rem; }

/* Sidebar */
.qz-sidebar { position: sticky; top: calc(56px + 5rem); }
.sidebar-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.sidebar-title { font-size: 0.72rem; font-weight: 600; color: var(--t2); text-transform: uppercase; letter-spacing: 0.08em; }

.q-map { display: flex; flex-wrap: wrap; gap: 5px; }
.q-map-dot {
  width: 26px; height: 26px; border-radius: var(--r3);
  border: 1px solid var(--border2); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 600; color: var(--t3);
  transition: all 0.2s; cursor: default;
}
.q-map-done { background: rgba(91,91,214,0.15); border-color: rgba(91,91,214,0.35); color: var(--ind3); }

.sidebar-divider { margin: 0; }

.sidebar-stat { display: flex; flex-direction: column; gap: 0.6rem; }
.ss-row { display: flex; justify-content: space-between; align-items: center; }
.ss-label { font-size: 0.78rem; color: var(--t2); }
.ss-val { font-size: 0.82rem; font-weight: 600; color: var(--text); }
.ss-val.ok { color: var(--ok); }
.ss-val.muted { color: var(--t3); }

/* Question card */
.qcard {
  padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
  transition: border-color 0.2s;
}
.qcard-done { border-color: rgba(91,91,214,0.25); }

.qcard-top { display: flex; align-items: center; justify-content: space-between; }
.qcard-meta { display: flex; align-items: center; gap: 0.55rem; }
.qcard-num { font-size: 0.7rem; font-weight: 700; color: var(--t3); letter-spacing: 0.06em; text-transform: uppercase; }

.qcard-done-badge {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.7rem; font-weight: 600; color: var(--ok);
  background: rgba(61,214,140,0.08); border: 1px solid rgba(61,214,140,0.2);
  padding: 0.2rem 0.6rem; border-radius: 100px;
}

.qcard-q { font-size: 1rem; line-height: 1.65; color: var(--text); font-weight: 400; }

/* Options */
.opts { display: flex; flex-direction: column; gap: 0.45rem; }
.opt {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.75rem 1rem; border-radius: var(--r3);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; font-size: 0.9rem; transition: all 0.16s; cursor: pointer;
}
.opt:hover { border-color: var(--border2); background: var(--surface2); }
.opt-sel { border-color: var(--ind) !important; background: rgba(91,91,214,0.09) !important; }

.opt-letter {
  width: 24px; height: 24px; border-radius: var(--r3);
  border: 1px solid var(--border2); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.68rem; font-weight: 700; color: var(--t2);
  flex-shrink: 0; transition: all 0.16s; font-family: var(--font-body);
}
.opt-sel .opt-letter { background: var(--ind); border-color: var(--ind); color: white; }
.opt-text { flex: 1; line-height: 1.45; color: var(--text); }
.opt-tick { margin-left: auto; flex-shrink: 0; }

.qcard-ta {
  width: 100%; padding: 0.85rem 1rem; resize: vertical;
  line-height: 1.6;
}

/* Modal */
.modal-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72);
  backdrop-filter: blur(8px); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-box { padding: 2rem; max-width: 400px; width: 100%; display: flex; flex-direction: column; gap: 1.1rem; }
.modal-icon-wrap {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.2);
  display: flex; align-items: center; justify-content: center;
}
.modal-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; }
.modal-body  { font-size: 0.875rem; color: var(--t2); line-height: 1.6; }
.modal-actions { display: flex; gap: 0.75rem; }
`;