import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function QuizPage({ questions, onSubmit, onBack }) {
  const [answers, setAnswers]   = useState({});       // { [id]: value }
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [modal, setModal]       = useState(false);

  const set = (id, val) => setAnswers(p => ({ ...p, [id]: val }));

  const attempted = Object.values(answers).filter(v => v !== null && v !== undefined && v !== "").length;
  const pct = Math.round((attempted / questions.length) * 100);

  const trySubmit = () => {
    const blank = questions.length - attempted;
    blank > 0 ? setModal(true) : doSubmit();
  };

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
    <div className="page">
      <div className="ambient"><div className="ambient-a"/><div className="ambient-b"/><div className="ambient-c"/></div>

      <div className="wrap qz-layout">
        {/* Sticky header */}
        <div className="qz-header">
          <button className="btn btn-ghost" onClick={onBack}>← Config</button>

          <div className="qz-progress">
            <span className="qz-prog-label">{attempted}/{questions.length} answered</span>
            <div className="qz-bar">
              <div className="qz-bar-fill" style={{ width: `${pct}%` }}/>
            </div>
          </div>

          <span className="qz-pct">{pct}%</span>
        </div>

        <div className="qz-title-row">
          <h2 className="qz-title">Answer the Questions</h2>
          <span className="tag tag-v">{questions.length} Questions</span>
        </div>

        {/* Questions */}
        <div className="qz-list">
          {questions.map((q, i) => (
            <QCard key={q.id} q={q} index={i} answer={answers[q.id]} onAnswer={v => set(q.id, v)} />
          ))}
        </div>

        {error && <div className="err-box">{error}</div>}

        <button className="btn btn-primary" onClick={trySubmit} disabled={loading}>
          {loading ? <><span className="spin"/> Grading your answers…</> : "Submit Quiz →"}
        </button>
      </div>

      {/* Confirmation modal */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal-box card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">
              {questions.length - attempted} question{questions.length - attempted > 1 ? "s" : ""} unanswered
            </h3>
            <p className="modal-body">
              Unanswered questions will score 0. You can go back and fill them in,
              or submit now.
            </p>
            <div className="modal-btns">
              <button className="btn btn-ghost" style={{padding:"0.75rem 1.25rem"}} onClick={() => setModal(false)}>Keep reviewing</button>
              <button className="btn btn-primary" style={{maxWidth:200}} onClick={doSubmit}>Submit anyway</button>
            </div>
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

function QCard({ q, index, answer, onAnswer }) {
  const answered = answer !== null && answer !== undefined && answer !== "";

  return (
    <div className={`qcard card ${answered ? "qcard-done" : ""}`}>
      <div className="qcard-meta">
        <span className="qcard-num">Q{index + 1}</span>
        <span className={`tag ${q.type === "mcq" ? "tag-v" : "tag-teal"}`}>
          {q.type === "mcq" ? "MCQ" : "Short Answer"}
        </span>
        {answered && <span className="qcard-check">✓ Answered</span>}
      </div>

      <p className="qcard-text">{q.question}</p>

      {q.type === "mcq" ? (
        <div className="opt-list">
          {q.options.map((opt, i) => (
            <button key={i} className={`opt ${answer === i ? "opt-sel" : ""}`} onClick={() => onAnswer(i)}>
              <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
              <span className="opt-text">{opt}</span>
              {answer === i && (
                <span className="opt-tick">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="short-ta"
          placeholder="Type your answer here…"
          value={answer || ""}
          rows={3}
          onChange={e => onAnswer(e.target.value)}
        />
      )}
    </div>
  );
}

const css = `
.qz-layout {
  max-width: 680px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.5rem;
  padding-top: 1rem;
}

.qz-header {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(6,6,15,0.8); backdrop-filter: blur(12px);
  padding: 0.75rem; border-radius: var(--r);
  border: 1px solid var(--border);
  position: sticky; top: 1rem; z-index: 10;
}

.qz-progress { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; }
.qz-prog-label { font-size: 0.75rem; color: var(--muted); }
.qz-bar { height: 4px; background: var(--border); border-radius: 100px; overflow: hidden; }
.qz-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--v) 0%, var(--teal) 100%);
  border-radius: 100px; transition: width 0.35s ease;
}
.qz-pct {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem; font-weight: 700; color: var(--v2); min-width: 36px; text-align: right;
}

.qz-title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
.qz-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; }

.qz-list { display: flex; flex-direction: column; gap: 1.1rem; }

/* Question card */
.qcard {
  padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
  transition: border-color 0.2s;
}
.qcard-done { border-color: rgba(124,110,247,0.3); }

.qcard-meta { display: flex; align-items: center; gap: 0.6rem; }
.qcard-num { font-size: 0.7rem; font-weight: 700; color: var(--muted); letter-spacing: 0.06em; }
.qcard-check { margin-left: auto; font-size: 0.72rem; color: var(--ok); font-weight: 600; }

.qcard-text { font-size: 0.975rem; line-height: 1.65; color: var(--text); }

/* Options */
.opt-list { display: flex; flex-direction: column; gap: 0.45rem; }

.opt {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.75rem 1rem; border-radius: var(--r2);
  border: 1px solid var(--border); background: rgba(255,255,255,0.02);
  text-align: left; transition: all 0.17s; font-size: 0.9rem;
}
.opt:hover { border-color: var(--border-h); background: var(--surface-h); }
.opt-sel {
  border-color: var(--v) !important;
  background: rgba(124,110,247,0.1) !important;
}

.opt-letter {
  width: 26px; height: 26px; border-radius: 50%;
  border: 1.5px solid var(--border-h);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
  color: var(--muted); transition: all 0.17s;
  font-family: 'Space Grotesk', sans-serif;
}
.opt-sel .opt-letter {
  background: var(--v); border-color: var(--v); color: white;
}

.opt-text { flex: 1; color: var(--text); line-height: 1.4; }
.opt-tick { margin-left: auto; color: var(--ok); flex-shrink: 0; }

/* Short textarea */
.short-ta {
  width: 100%; background: rgba(255,255,255,0.03);
  border: 1px solid var(--border); border-radius: var(--r2);
  padding: 0.85rem 1rem; color: var(--text);
  font-size: 0.9rem; line-height: 1.6; resize: vertical; outline: none;
  transition: border-color 0.2s;
}
.short-ta:focus { border-color: var(--v); background: rgba(124,110,247,0.04); }
.short-ta::placeholder { color: var(--muted); }

/* Modal */
.modal-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.modal-box { padding: 2rem; max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: 1rem; }
.modal-icon { font-size: 2rem; }
.modal-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem; font-weight: 700; }
.modal-body  { font-size: 0.875rem; color: var(--t2); line-height: 1.6; }
.modal-btns  { display: flex; gap: 0.75rem; margin-top: 0.25rem; flex-wrap: wrap; }
`;
