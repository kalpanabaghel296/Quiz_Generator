import { useState } from "react";

// ─── jsPDF loaded from CDN via dynamic import ───────────────────────────────
// Make sure in your index.html you have:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// OR use: npm install jspdf  and  import jsPDF from 'jspdf'

export default function ResultsPage({ result, questions, onRestart }) {
  const [expanded, setExpanded] = useState(null);
  const [dlLoading, setDlLoading] = useState("");   // "answers" | "blank" | ""

  const { summary, breakdown } = result;
  const qMap = Object.fromEntries(questions.map(q => [q.id, q]));

  const toggle = id => setExpanded(p => p === id ? null : id);

  // ── Grade colour ────────────────────────────────────────────────────────
  const gradeColor = { A:"#34d399", B:"#60a5fa", C:"#fbbf24", D:"#f97316", F:"#fb7185" }[summary.grade] || "#a89cf8";
  const gradeBg    = { A:"rgba(52,211,153,0.1)", B:"rgba(96,165,250,0.1)", C:"rgba(251,191,36,0.1)", D:"rgba(249,115,22,0.1)", F:"rgba(251,113,133,0.1)" }[summary.grade] || "rgba(168,156,248,0.1)";

  // ── PDF generator ────────────────────────────────────────────────────────
  const exportPDF = async (withAnswers) => {
    setDlLoading(withAnswers ? "answers" : "blank");
    try {
      // Support both CDN (window.jspdf) and npm import
      let jsPDF;
      if (window.jspdf) {
        jsPDF = window.jspdf.jsPDF;
      } else {
        const mod = await import("jspdf");
        jsPDF = mod.default || mod.jsPDF;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 50, MR = 50, MT = 60;
      let y = MT;

      const checkPage = (needed = 40) => {
        if (y + needed > PH - 50) { doc.addPage(); y = MT; }
      };

      // ── Helpers ──────────────────────────────────────────────────────────
      const wrapText = (text, maxW, fontSize) => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(String(text), maxW);
      };

      const drawText = (text, x, yy, size, color, style = "normal") => {
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont("helvetica", style);
        doc.text(text, x, yy);
      };

      const drawRect = (x, yy, w, h, fillRgb, strokeRgb) => {
        if (fillRgb)   { doc.setFillColor(...fillRgb);   doc.rect(x, yy, w, h, "F"); }
        if (strokeRgb) { doc.setDrawColor(...strokeRgb); doc.rect(x, yy, w, h, "S"); }
      };

      // ── Cover / header ───────────────────────────────────────────────────
      // Top banner
      drawRect(0, 0, PW, 100, [108, 92, 231]);
      drawText("AI QUIZ GENERATOR", ML, 38, 10, [255,255,255], "bold");
      drawText(withAnswers ? "Quiz with Answer Key" : "Quiz Paper (No Answers)", ML, 58, 18, [255,255,255], "bold");
      drawText(`Generated ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}`, ML, 78, 9, [200,196,255]);

      if (withAnswers) {
        // Score badge on cover
        const badge = `Score: ${summary.score}/${summary.max_score}  (${summary.percentage}%)  Grade: ${summary.grade}`;
        drawText(badge, ML, 94, 9, [255,255,230], "bold");
      }

      y = 130;

      if (withAnswers) {
        // ── Summary box ───────────────────────────────────────────────────
        drawRect(ML, y, PW - ML - MR, 72, [245, 244, 255], [200, 196, 255]);
        drawText("RESULTS SUMMARY", ML + 14, y + 18, 8, [108,92,231], "bold");

        const stats = [
          ["Total Questions", summary.total_questions],
          ["Correct",         summary.correct],
          ["Partial Credit",  summary.partial],
          ["Attempted",       summary.attempted],
          ["Score",           `${summary.score} / ${summary.max_score}`],
          ["Percentage",      `${summary.percentage}%`],
          ["Grade",           summary.grade],
        ];

        let sx = ML + 14, sy = y + 32, col = 0;
        stats.forEach(([label, val]) => {
          drawText(`${label}: `, sx, sy, 8, [80,80,120]);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 80);
          doc.text(String(val), sx + doc.getTextWidth(`${label}: `), sy);
          sy += 14; col++;
          if (col === 4) { sx = ML + 14 + (PW - ML - MR) / 2; sy = y + 32; }
        });
        y += 90;
      }

      // ── Questions ────────────────────────────────────────────────────────
      breakdown.forEach((item, idx) => {
        const q = qMap[item.id];
        const qNum = idx + 1;

        checkPage(60);

        // Question header chip
        const chipW = 200;
        drawRect(ML, y, chipW, 18, [235, 232, 255]);
        drawText(`Q${qNum}  ·  ${q.type === "mcq" ? "Multiple Choice" : "Short Answer"}`, ML + 8, y + 12, 8, [80, 60, 200], "bold");

        y += 26;
        checkPage(40);

        // Question text
        const qLines = wrapText(q.question, PW - ML - MR - 10, 10.5);
        doc.setFontSize(10.5);
        doc.setTextColor(30, 30, 50);
        doc.setFont("helvetica", "normal");
        doc.text(qLines, ML, y);
        y += qLines.length * 14 + 8;

        // Options (MCQ)
        if (q.type === "mcq" && q.options) {
          q.options.forEach((opt, i) => {
            checkPage(20);
            const letter = String.fromCharCode(65 + i);
            const isCorrect = withAnswers && i === item.correct_answer;
            const isUserPick = withAnswers && i === item.user_answer;

            // Highlight correct answer in answer-key version
            if (isCorrect && withAnswers) {
              drawRect(ML + 10, y - 11, PW - ML - MR - 10, 16, [220, 255, 235]);
            }

            const prefix = `  ${letter}.  `;
            const optLines = wrapText(`${prefix}${opt}`, PW - ML - MR - 22, 9.5);
            doc.setFontSize(9.5);
            doc.setTextColor(isCorrect ? 20 : 50, isCorrect ? 120 : 50, isCorrect ? 60 : 70);
            doc.setFont("helvetica", isCorrect ? "bold" : "normal");
            doc.text(optLines, ML + 14, y);

            if (isCorrect && withAnswers) {
              doc.setTextColor(20, 140, 70);
              doc.setFontSize(8);
              doc.text("✓ Correct", PW - MR - 50, y);
            }
            if (isUserPick && withAnswers && !isCorrect) {
              doc.setTextColor(200, 50, 50);
              doc.setFontSize(8);
              doc.text("✗ Your answer", PW - MR - 70, y);
            }

            y += optLines.length * 12 + 4;
          });
        }

        // Short answer space / answer
        if (q.type === "short") {
          if (!withAnswers) {
            // Blank answer lines
            checkPage(50);
            y += 6;
            for (let line = 0; line < 3; line++) {
              doc.setDrawColor(180, 180, 200);
              doc.setLineWidth(0.5);
              doc.line(ML, y, PW - MR, y);
              y += 18;
            }
          } else {
            // Show answer
            checkPage(40);
            drawRect(ML, y, PW - ML - MR, 14, [240, 250, 245]);
            drawText("Correct Answer:", ML + 8, y + 10, 8, [20, 120, 70], "bold");
            y += 20;
            const aLines = wrapText(String(item.correct_answer), PW - ML - MR - 20, 9.5);
            doc.setFontSize(9.5);
            doc.setTextColor(20, 100, 60);
            doc.setFont("helvetica", "normal");
            doc.text(aLines, ML + 10, y);
            y += aLines.length * 13 + 4;

            // Feedback
            if (item.feedback) {
              checkPage(20);
              const fbLines = wrapText(`Feedback: ${item.feedback}`, PW - ML - MR - 20, 8.5);
              doc.setFontSize(8.5);
              doc.setTextColor(100, 100, 140);
              doc.text(fbLines, ML + 10, y);
              y += fbLines.length * 11 + 4;
            }
          }
        }

        y += 16;

        // Divider
        checkPage(5);
        doc.setDrawColor(220, 218, 240);
        doc.setLineWidth(0.3);
        doc.line(ML, y, PW - MR, y);
        y += 14;
      });

      // ── Footer on each page ───────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 180);
        doc.setFont("helvetica", "normal");
        doc.text("AI Quiz Generator", ML, PH - 22);
        doc.text(`Page ${p} of ${totalPages}`, PW - MR - 50, PH - 22);
        doc.setDrawColor(220, 218, 240);
        doc.setLineWidth(0.3);
        doc.line(ML, PH - 30, PW - MR, PH - 30);
      }

      const fname = withAnswers ? "quiz-with-answers.pdf" : "quiz-blank.pdf";
      doc.save(fname);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    } finally {
      setDlLoading("");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="ambient"><div className="ambient-a"/><div className="ambient-b"/><div className="ambient-c"/></div>

      <div className="wrap res-layout">

        {/* ── Score card ── */}
        <div className="score-card card">
          <div className="score-left">
            <div className="score-circle" style={{ "--gc": gradeColor, "--gb": gradeBg }}>
              <span className="score-grade">{summary.grade}</span>
              <span className="score-pct-label">{summary.percentage}%</span>
            </div>
          </div>

          <div className="score-right">
            <div className="score-msg">{scoreMessage(summary.grade)}</div>
            <div className="score-stats">
              {[
                { label:"Correct",  val: summary.correct,                              color:"var(--ok)"   },
                { label:"Partial",  val: summary.partial,                              color:"var(--warn)"  },
                { label:"Wrong",    val: summary.total_questions - summary.correct - summary.partial, color:"var(--bad)"  },
                { label:"Skipped",  val: summary.total_questions - summary.attempted,  color:"var(--muted)" },
              ].map(s => (
                <div key={s.label} className="score-stat">
                  <span className="stat-n" style={{ color: s.color }}>{s.val}</span>
                  <span className="stat-l">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="score-bar-wrap">
              <div className="score-bar">
                <div className="score-bar-fill" style={{ width:`${summary.percentage}%`, background: `linear-gradient(90deg, ${gradeColor}88, ${gradeColor})` }}/>
              </div>
              <span className="score-pts">{summary.score} / {summary.max_score} pts</span>
            </div>
          </div>
        </div>

        {/* ── PDF Export buttons ── */}
        <div className="export-section">
          <div className="export-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--v2)" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="14,2 14,8 20,8" stroke="var(--v2)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 18v-6M9 15l3 3 3-3" stroke="var(--v2)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Download Quiz as PDF
          </div>
          <div className="export-btns">
            {/* Blank quiz */}
            <button
              className={`export-btn card ${dlLoading==="blank" ? "export-loading" : ""}`}
              onClick={() => exportPDF(false)}
              disabled={!!dlLoading}
            >
              <div className="export-icon blank-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="export-info">
                <span className="export-label">Questions Only</span>
                <span className="export-sub">Blank answer spaces · for practice</span>
              </div>
              {dlLoading==="blank"
                ? <span className="spin" style={{flexShrink:0}}/>
                : <span className="export-arrow">↓</span>}
            </button>

            {/* With answers */}
            <button
              className={`export-btn card export-answers ${dlLoading==="answers" ? "export-loading" : ""}`}
              onClick={() => exportPDF(true)}
              disabled={!!dlLoading}
            >
              <div className="export-icon ans-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13l2.5 2.5L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="export-info">
                <span className="export-label">With Answer Key</span>
                <span className="export-sub">Correct answers + feedback · for review</span>
              </div>
              {dlLoading==="answers"
                ? <span className="spin" style={{flexShrink:0}}/>
                : <span className="export-arrow">↓</span>}
            </button>
          </div>
          <p className="export-note">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
              <circle cx="8" cy="8" r="6.5" stroke="var(--muted)" strokeWidth="1.2"/>
              <path d="M8 7v5M8 5.5v.5" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Requires jsPDF · run <code>npm install jspdf</code> or include the CDN script in your index.html
          </p>
        </div>

        {/* ── Breakdown ── */}
        <div className="breakdown-header-row">
          <h3 className="breakdown-heading">Question Breakdown</h3>
          <span className="tag tag-v">{breakdown.length} questions</span>
        </div>

        <div className="breakdown-list">
          {breakdown.map((item, idx) => {
            const q = qMap[item.id];
            const open = expanded === item.id;
            const status = item.score === 1 ? "ok" : item.score > 0 ? "partial" : "bad";

            return (
              <div key={item.id} className={`bd-card card bd-${status}`}>
                <button className="bd-header" onClick={() => toggle(item.id)}>
                  <div className="bd-left">
                    <span className={`bd-dot bd-dot-${status}`}/>
                    <span className="bd-qn">Q{idx + 1}</span>
                    <span className={`tag ${q?.type==="mcq" ? "tag-v" : "tag-teal"}`}>
                      {q?.type==="mcq" ? "MCQ" : "Short"}
                    </span>
                    <span className="bd-q">{q?.question}</span>
                  </div>
                  <div className="bd-right">
                    <span className={`bd-score bd-score-${status}`}>
                      {item.score === 1 ? "✓ Full" : item.score > 0 ? `~${Math.round(item.score*100)}%` : "✗ 0"}
                    </span>
                    <span className="bd-chev">{open ? "▲" : "▼"}</span>
                  </div>
                </button>

                {open && (
                  <div className="bd-body">
                    <div className="bd-row">
                      <span className="bd-row-label">Your answer</span>
                      <span className="bd-row-val user-val">
                        {fmtAnswer(item.user_answer, q) || <em style={{opacity:0.4}}>Not answered</em>}
                      </span>
                    </div>
                    <div className="bd-row">
                      <span className="bd-row-label">Correct answer</span>
                      <span className="bd-row-val ok-val">
                        {fmtAnswer(item.correct_answer, q)}
                      </span>
                    </div>
                    <div className={`bd-feedback bd-fb-${status}`}>
                      <span className="bd-fb-icon">
                        {item.score===1 ? "✅" : item.score>0 ? "🔶" : "❌"}
                      </span>
                      <span className="bd-fb-text">{item.feedback}</span>
                    </div>
                    {item.strategy_used && item.strategy_used !== "unanswered" && (
                      <div className="bd-strategy">
                        Grading method: <code>{item.strategy_used}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Restart */}
        <div className="res-actions">
          <button className="btn btn-outline" style={{width:"auto",padding:"0.85rem 2rem"}} onClick={onRestart}>
            ↺ Start a new quiz
          </button>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtAnswer(val, q) {
  if (val === null || val === undefined || val === "") return null;
  if (q?.type === "mcq" && q?.options) {
    const i = parseInt(val);
    if (!isNaN(i) && q.options[i]) return `${String.fromCharCode(65+i)}. ${q.options[i]}`;
  }
  return String(val);
}

function scoreMessage(grade) {
  return {
    A: "Outstanding! Excellent command of the material. 🎉",
    B: "Great work! You understand the content well. 👍",
    C: "Solid attempt. Review the missed topics to level up. 📚",
    D: "You're getting there — revisit the material and try again. 💪",
    F: "Keep going! Understanding grows with practice. 🔄",
  }[grade] || "Quiz complete!";
}

// ── Styles ───────────────────────────────────────────────────────────────────
const css = `
.res-layout {
  max-width: 700px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.5rem;
  padding-top: 1.5rem;
}

/* Score card */
.score-card {
  padding: 1.75rem;
  display: flex; align-items: center; gap: 2rem;
  flex-wrap: wrap;
}

.score-left { flex-shrink: 0; }

.score-circle {
  width: 96px; height: 96px; border-radius: 50%;
  border: 3px solid var(--gc);
  background: var(--gb);
  box-shadow: 0 0 30px color-mix(in srgb, var(--gc) 28%, transparent);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.score-grade {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.2rem; font-weight: 700;
  color: var(--gc); line-height: 1;
}
.score-pct-label { font-size: 0.68rem; color: var(--muted); margin-top: 2px; }

.score-right { flex: 1; display: flex; flex-direction: column; gap: 1rem; min-width: 220px; }
.score-msg   { font-size: 0.875rem; color: var(--t2); line-height: 1.5; }

.score-stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.score-stat  { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.stat-n { font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; line-height: 1; }
.stat-l { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }

.score-bar-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
.score-bar { height: 5px; background: var(--border); border-radius: 100px; overflow: hidden; }
.score-bar-fill { height: 100%; border-radius: 100px; transition: width 1.2s cubic-bezier(.4,0,.2,1); }
.score-pts { font-size: 0.78rem; color: var(--muted); }

/* Export section */
.export-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
}

.export-title {
  display: flex; align-items: center; gap: 0.55rem;
  font-size: 0.95rem; font-weight: 700; color: var(--text);
}

.export-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
@media (max-width: 520px) { .export-btns { grid-template-columns: 1fr; } }

.export-btn {
  display: flex; align-items: center; gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border-h);
  background: rgba(255,255,255,0.025);
  border-radius: var(--r);
  text-align: left; transition: all 0.22s;
  cursor: pointer;
}
.export-btn:hover:not(:disabled) {
  border-color: var(--v);
  background: rgba(124,110,247,0.07);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(108,92,231,0.2);
}
.export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.export-loading { opacity: 0.7 !important; }

.export-answers:hover:not(:disabled) {
  border-color: var(--ok);
  background: rgba(52,211,153,0.06);
  box-shadow: 0 6px 20px rgba(52,211,153,0.15);
}

.export-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.blank-icon { background: rgba(124,110,247,0.12); color: var(--v2); border: 1px solid rgba(124,110,247,0.2); }
.ans-icon   { background: rgba(52,211,153,0.1);  color: var(--ok); border: 1px solid rgba(52,211,153,0.2); }

.export-info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; overflow: hidden; }
.export-label { font-size: 0.875rem; font-weight: 700; color: var(--text); }
.export-sub   { font-size: 0.72rem; color: var(--muted); }

.export-arrow {
  font-size: 1.1rem; color: var(--muted); flex-shrink: 0;
  transition: transform 0.2s;
}
.export-btn:hover .export-arrow { transform: translateY(2px); color: var(--text); }

.export-note {
  display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.72rem; color: var(--muted); line-height: 1.5;
}
.export-note code {
  font-size: 0.7rem; background: var(--surface-h);
  padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace;
  color: var(--v2);
}

/* Breakdown */
.breakdown-header-row { display: flex; align-items: center; justify-content: space-between; }
.breakdown-heading { font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem; font-weight: 700; }

.breakdown-list { display: flex; flex-direction: column; gap: 0.75rem; }

.bd-card {
  overflow: hidden; transition: border-color 0.2s;
  border-left-width: 3px !important;
}
.bd-ok      { border-left-color: var(--ok)   !important; }
.bd-partial { border-left-color: var(--warn)  !important; }
.bd-bad     { border-left-color: var(--bad)   !important; }

.bd-header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; background: none; border: none; cursor: pointer;
  gap: 0.75rem; text-align: left;
}

.bd-left {
  display: flex; align-items: center; gap: 0.55rem;
  flex: 1; overflow: hidden; min-width: 0;
}

.bd-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.bd-dot-ok      { background: var(--ok); }
.bd-dot-partial { background: var(--warn); }
.bd-dot-bad     { background: var(--bad); }

.bd-qn   { font-size: 0.72rem; font-weight: 700; color: var(--muted); flex-shrink: 0; }
.bd-q    { font-size: 0.875rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bd-right { display: flex; align-items: center; gap: 0.7rem; flex-shrink: 0; }

.bd-score        { font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 700; }
.bd-score-ok     { color: var(--ok);   }
.bd-score-partial{ color: var(--warn); }
.bd-score-bad    { color: var(--bad);  }

.bd-chev { font-size: 0.6rem; color: var(--muted); }

.bd-body {
  padding: 0 1.25rem 1.25rem;
  display: flex; flex-direction: column; gap: 0.75rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  animation: fadeIn 0.18s ease;
}
@keyframes fadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform:none; } }

.bd-row { display: flex; flex-direction: column; gap: 0.25rem; }
.bd-row-label { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-weight: 700; }
.bd-row-val { font-size: 0.88rem; padding: 0.5rem 0.75rem; border-radius: 8px; line-height: 1.5; }
.user-val { background: rgba(255,255,255,0.04); color: var(--text); }
.ok-val   { background: rgba(52,211,153,0.07);  color: var(--ok);  }

.bd-feedback {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.7rem 0.9rem; border-radius: 8px;
}
.bd-fb-ok      { background: rgba(52,211,153,0.07);  }
.bd-fb-partial { background: rgba(251,191,36,0.07);   }
.bd-fb-bad     { background: rgba(251,113,133,0.07);  }
.bd-fb-icon    { flex-shrink: 0; font-size: 0.9rem; }
.bd-fb-text    { font-size: 0.855rem; color: var(--t2); line-height: 1.55; }

.bd-strategy {
  font-size: 0.7rem; color: var(--muted); opacity: 0.7;
}
.bd-strategy code {
  background: var(--surface-h); padding: 0.1rem 0.4rem;
  border-radius: 4px; font-family: monospace; font-size: 0.68rem;
  color: var(--v2);
}

.res-actions { display: flex; justify-content: center; padding-top: 0.5rem; }
`;
