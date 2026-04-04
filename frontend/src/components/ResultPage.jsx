import { useState } from "react";

export default function ResultsPage({ result, questions, onRestart }) {
  const [expanded, setExpanded] = useState(null);
  const [dlLoading, setDlLoading] = useState("");

  const { summary, breakdown } = result;
  const qMap = Object.fromEntries(questions.map(q => [q.id, q]));

  const toggle = id => setExpanded(p => p === id ? null : id);

  const GRADE_THEME = {
    A: { color: "#3dd68c", bg: "rgba(61,214,140,0.08)",  border: "rgba(61,214,140,0.2)"  },
    B: { color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)"  },
    C: { color: "#f5a623", bg: "rgba(245,166,35,0.08)",  border: "rgba(245,166,35,0.2)"  },
    D: { color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
    F: { color: "#e5484d", bg: "rgba(229,72,77,0.08)",   border: "rgba(229,72,77,0.2)"   },
  };
  const theme = GRADE_THEME[summary.grade] || GRADE_THEME["B"];

  const exportPDF = async (withAnswers) => {
    setDlLoading(withAnswers ? "answers" : "blank");
    try {
      let jsPDF;
      if (window.jspdf?.jsPDF)  jsPDF = window.jspdf.jsPDF;
      else if (window.jsPDF)    jsPDF = window.jsPDF;
      else { const m = await import("jspdf"); jsPDF = m.default || m.jsPDF; }

      const doc = new jsPDF({ unit:"pt", format:"a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const ML = 52, MR = 52, MT = 56;
      let y = MT;

      const np = (need=40) => { if (y+need > H-48) { doc.addPage(); y = MT; } };
      const safe = t => String(t||"").replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">");
      const hex = (r,g,b) => `#${[r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("")}`;

      const setFont = (size, color=[30,30,50], style="normal") => {
        doc.setFontSize(size); doc.setTextColor(...color); doc.setFont("helvetica", style);
      };

      // ── Banner ──────────────────────────────────────────────────────────
      doc.setFillColor(24,24,40); doc.rect(0,0,W,88,"F");
      doc.setFillColor(91,91,214);
      doc.roundedRect(ML, 20, 28, 28, 4, 4, "F");
      setFont(7,[200,200,255],"bold");
      doc.text("QF", ML+7, 38);

      setFont(16,[232,232,244],"bold");
      doc.text("EduQuiz", ML+36, 34);
      setFont(8,[136,136,170]);
      doc.text(withAnswers ? "Quiz · Answer Key" : "Quiz · Question Paper", ML+36, 46);

      setFont(8,[136,136,170]);
      doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`, W-MR-120, 38);

      if (withAnswers) {
        const badge = `${summary.grade}  ·  ${summary.percentage}%  ·  ${summary.score}/${summary.max_score} pts`;
        setFont(8,[171,171,240],"bold");
        doc.text(badge, W-MR-120, 52);
      }

      y = 112;

      // ── Summary box (answers version only) ──────────────────────────────
      if (withAnswers) {
        doc.setFillColor(245,244,255); doc.roundedRect(ML, y, W-ML-MR, 70, 6, 6, "F");
        doc.setDrawColor(200,196,255); doc.setLineWidth(0.5); doc.roundedRect(ML, y, W-ML-MR, 70, 6, 6, "S");

        setFont(7,[91,91,214],"bold");
        doc.text("RESULTS SUMMARY", ML+14, y+16);

        const stats = [
          ["Score", `${summary.score} / ${summary.max_score}`],
          ["Percentage", `${summary.percentage}%`],
          ["Grade", summary.grade],
          ["Correct", `${summary.correct}`],
          ["Partial", `${summary.partial}`],
          ["Attempted", `${summary.attempted} / ${summary.total_questions}`],
        ];

        let sx = ML+14; let sy = y+30;
        stats.forEach(([l,v],i) => {
          setFont(7.5,[100,100,140]);
          doc.text(`${l}: `, sx, sy);
          setFont(7.5,[30,30,70],"bold");
          doc.text(v, sx + doc.getTextWidth(`${l}: `), sy);
          sy += 13;
          if (i === 2) { sx = ML + 14 + (W-ML-MR)/2; sy = y+30; }
        });

        y += 90;
      }

      // ── Questions ────────────────────────────────────────────────────────
      breakdown.forEach((item, idx) => {
        const q = qMap[item.id];
        np(70);

        // Question number chip
        doc.setFillColor(238,236,255); doc.roundedRect(ML, y, 180, 16, 3, 3, "F");
        setFont(7.5,[91,91,214],"bold");
        doc.text(`Q${idx+1}  ·  ${q.type==="mcq"?"Multiple Choice":"Short Answer"}`, ML+8, y+11);
        y += 24;

        np(30);
        const qLines = doc.splitTextToSize(q.question, W-ML-MR-10);
        setFont(10.5,[20,20,40]);
        doc.text(qLines, ML, y);
        y += qLines.length * 14 + 10;

        if (q.type==="mcq" && q.options) {
          q.options.forEach((opt,i) => {
            np(18);
            const isCorrect = withAnswers && i===item.correct_answer;
            const isUser    = withAnswers && i===item.user_answer && !isCorrect;
            if (isCorrect) { doc.setFillColor(220,255,235); doc.roundedRect(ML+10,y-11,W-ML-MR-10,15,2,2,"F"); }
            const prefix = `  ${String.fromCharCode(65+i)}.  `;
            const oLines = doc.splitTextToSize(`${prefix}${opt}`, W-ML-MR-24);
            doc.setFontSize(9.5);
            doc.setTextColor(...(isCorrect?[20,120,70]:isUser?[180,40,40]:[50,50,75]));
            doc.setFont("helvetica", isCorrect?"bold":"normal");
            doc.text(oLines, ML+14, y);
            if (isCorrect && withAnswers) { setFont(7.5,[20,140,70],"bold"); doc.text("✓ Correct",W-MR-52,y); }
            if (isUser) { setFont(7.5,[180,40,40],"bold"); doc.text("✗ Yours",W-MR-45,y); }
            y += oLines.length*12+4;
          });
        }

        if (q.type==="short") {
          if (!withAnswers) {
            np(50); y += 6;
            for (let l=0; l<3; l++) {
              doc.setDrawColor(180,180,210); doc.setLineWidth(0.4);
              doc.line(ML, y, W-MR, y); y += 17;
            }
          } else {
            np(36);
            doc.setFillColor(235,252,243); doc.roundedRect(ML,y,W-ML-MR,13,2,2,"F");
            setFont(7.5,[20,120,70],"bold"); doc.text("Correct Answer:", ML+8, y+10);
            y += 18;
            const aLines = doc.splitTextToSize(String(item.correct_answer||""), W-ML-MR-20);
            setFont(9.5,[20,100,60]); doc.text(aLines, ML+10, y);
            y += aLines.length*13+4;
            if (item.feedback) {
              np(18);
              const fb = doc.splitTextToSize(`Feedback: ${item.feedback}`, W-ML-MR-20);
              setFont(8.5,[110,110,150],"italic"); doc.text(fb, ML+10, y);
              y += fb.length*12+4;
            }
          }
        }

        y += 14;
        np(4);
        doc.setDrawColor(220,218,240); doc.setLineWidth(0.3); doc.line(ML,y,W-MR,y);
        y += 14;
      });

      // ── Footer on each page ────────────────────────────────────────────
      const pages = doc.internal.getNumberOfPages();
      for (let p=1; p<=pages; p++) {
        doc.setPage(p);
        setFont(7.5,[120,120,150]);
        doc.text("EduQuiz · AI Assessment Tool", ML, H-22);
        doc.text(`Page ${p} of ${pages}`, W-MR-52, H-22);
        doc.setDrawColor(200,198,230); doc.setLineWidth(0.3);
        doc.line(ML, H-30, W-MR, H-30);
      }

      doc.save(withAnswers ? "EduQuiz-answer-key.pdf" : "EduQuiz-questions.pdf");
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed. Make sure jsPDF is installed: npm install jspdf");
    } finally { setDlLoading(""); }
  };

  return (
    <div className="page rs-page">
      <div className="glow"><div className="glow-a"/><div className="glow-b"/></div>

      <div className="wrap rs-wrap">

        {/* ── Score hero ── */}
        <div className="rs-hero card-elevated">
          <div className="rs-grade-wrap" style={{"--gc": theme.color, "--gb": theme.bg, "--gborder": theme.border}}>
            <div className="rs-grade-circle">
              <span className="rs-grade-letter">{summary.grade}</span>
              <span className="rs-grade-pct">{summary.percentage}%</span>
            </div>
          </div>

          <div className="rs-hero-body">
            <h2 className="rs-title">{scoreMsg(summary.grade)}</h2>
            <p className="rs-sub">
              You scored <strong>{summary.score} out of {summary.max_score}</strong> points across {summary.total_questions} questions.
            </p>

            <div className="rs-stats-row">
              {[
                { label:"Correct",  val: summary.correct,                                       color:"var(--ok)"  },
                { label:"Partial",  val: summary.partial,                                       color:"var(--warn)" },
                { label:"Wrong",    val: summary.total_questions-summary.correct-summary.partial, color:"var(--bad)"  },
                { label:"Skipped",  val: summary.total_questions-summary.attempted,             color:"var(--t3)"  },
              ].map(s => (
                <div key={s.label} className="rs-stat">
                  <span className="rs-stat-n" style={{color:s.color}}>{s.val}</span>
                  <span className="rs-stat-l">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="rs-bar-wrap">
              <div className="rs-bar">
                <div className="rs-bar-fill" style={{width:`${summary.percentage}%`, background:`linear-gradient(90deg,${theme.color}88,${theme.color})`}}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── PDF Export ── */}
        <div className="rs-export card-elevated">
          <div className="rs-export-header">
            <div className="rs-export-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="var(--ind3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export as PDF
            </div>
            <span className="rs-export-sub">Two formats available</span>
          </div>

          <div className="export-grid">
            <button
              className={`export-card ${dlLoading==="blank"?"export-loading":""}`}
              onClick={() => exportPDF(false)}
              disabled={!!dlLoading}
            >
              <div className="export-card-icon blank-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="export-card-text">
                <span className="ect-title">Questions Only</span>
                <span className="ect-sub">Blank answer spaces · for practice</span>
              </div>
              {dlLoading==="blank"
                ? <span className="spin" style={{flexShrink:0}}/>
                : <span className="export-dl">↓</span>}
            </button>

            <button
              className={`export-card export-answers ${dlLoading==="answers"?"export-loading":""}`}
              onClick={() => exportPDF(true)}
              disabled={!!dlLoading}
            >
              <div className="export-card-icon ans-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M8 13l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="export-card-text">
                <span className="ect-title">With Answer Key</span>
                <span className="ect-sub">Correct answers + AI feedback</span>
              </div>
              {dlLoading==="answers"
                ? <span className="spin" style={{flexShrink:0}}/>
                : <span className="export-dl">↓</span>}
            </button>
          </div>

          <p className="export-note">
            Requires <code>npm install jspdf</code> or jsPDF CDN in index.html
          </p>
        </div>

        {/* ── Breakdown ── */}
        <div className="rs-breakdown-head">
          <h3 className="rs-bd-title">Question Breakdown</h3>
          <span className="tag tag-neu">{breakdown.length} questions</span>
        </div>

        <div className="breakdown-list">
          {breakdown.map((item, idx) => {
            const q = qMap[item.id];
            const open = expanded === item.id;
            const status = item.score===1?"ok":item.score>0?"partial":"bad";
            const statusColors = {ok:"var(--ok)", partial:"var(--warn)", bad:"var(--bad)"};

            return (
              <div key={item.id} className={`bd-row card-elevated bd-${status}`}>
                <button className="bd-header" onClick={() => toggle(item.id)}>
                  <div className="bd-left">
                    <span className="bd-indicator" style={{background: statusColors[status]}}/>
                    <span className="bd-qn">Q{idx+1}</span>
                    <span className={`tag ${q?.type==="mcq"?"tag-ind":"tag-ok"}`}>
                      {q?.type==="mcq"?"MCQ":"Short"}
                    </span>
                    <span className="bd-q">{q?.question}</span>
                  </div>
                  <div className="bd-right">
                    <span className="bd-score" style={{color: statusColors[status]}}>
                      {item.score===1?"✓ Full":item.score>0?`${Math.round(item.score*100)}%`:"✗ 0"}
                    </span>
                    <svg className="bd-chev" style={{transform: open?"rotate(180deg)":"none", transition:"transform 0.2s"}} width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {open && (
                  <div className="bd-body">
                    <div className="bd-answers">
                      <div className="bd-ans-row">
                        <span className="bd-ans-label">Your answer</span>
                        <span className="bd-ans-val user-ans">
                          {fmtAns(item.user_answer, q) || <em style={{opacity:0.4, fontStyle:"italic"}}>Not answered</em>}
                        </span>
                      </div>
                      <div className="bd-ans-row">
                        <span className="bd-ans-label">Correct answer</span>
                        <span className="bd-ans-val ok-ans">{fmtAns(item.correct_answer, q)}</span>
                      </div>
                    </div>
                    <div className={`bd-feedback bd-fb-${status}`}>
                      <span>{item.score===1?"✅":item.score>0?"🔶":"❌"}</span>
                      <span className="bd-fb-text">{item.feedback}</span>
                    </div>
                    {item.strategy_used && item.strategy_used!=="unanswered" && (
                      <div className="bd-strategy">Grading: <code>{item.strategy_used}</code></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="rs-actions">
          <button className="btn btn-secondary" style={{width:"auto",padding:"0.75rem 2rem",gap:"0.5rem"}} onClick={onRestart}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 8a6 6 0 1011.8-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M2 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Start new quiz
          </button>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

function fmtAns(val, q) {
  if (val===null || val===undefined || val==="") return null;
  if (q?.type==="mcq" && q?.options) {
    const i = parseInt(val);
    if (!isNaN(i) && q.options[i]) return `${String.fromCharCode(65+i)}. ${q.options[i]}`;
  }
  return String(val);
}

function scoreMsg(g) {
  return {
    A:"Exceptional performance! 🎉",
    B:"Strong result — well done! 👍",
    C:"Solid effort. Review the gaps to improve. 📚",
    D:"Keep going — revisit the material. 💪",
    F:"Practice makes progress. Try again! 🔄",
  }[g] || "Quiz complete.";
}

const css = `
.rs-page { padding-top: 3rem; }

.rs-wrap {
  max-width: 820px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.5rem;
}

/* Score hero */
.rs-hero {
  padding: 2rem;
  display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap;
}

.rs-grade-wrap {
  flex-shrink: 0;
}

.rs-grade-circle {
  width: 100px; height: 100px; border-radius: 50%;
  border: 2px solid var(--gborder);
  background: var(--gb);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 0 32px color-mix(in srgb, var(--gc) 20%, transparent);
}

.rs-grade-letter {
  font-family: var(--font-display); font-style: italic;
  font-size: 2.8rem; line-height: 1; color: var(--gc);
}
.rs-grade-pct { font-size: 0.7rem; color: var(--t2); margin-top: 2px; font-weight: 500; }

.rs-hero-body { flex: 1; display: flex; flex-direction: column; gap: 0.85rem; min-width: 220px; }

.rs-title {
  font-family: var(--font-display);
  font-size: 1.4rem; font-weight: 400; letter-spacing: -0.01em;
}
.rs-sub { font-size: 0.875rem; color: var(--t2); line-height: 1.5; }

.rs-stats-row { display: flex; gap: 1.75rem; flex-wrap: wrap; }
.rs-stat { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.rs-stat-n { font-family: var(--font-display); font-style: italic; font-size: 1.8rem; line-height: 1; }
.rs-stat-l { font-size: 0.65rem; color: var(--t3); text-transform: uppercase; letter-spacing: 0.07em; }

.rs-bar-wrap {}
.rs-bar { height: 3px; background: var(--border2); border-radius: 100px; overflow: hidden; }
.rs-bar-fill { height: 100%; border-radius: 100px; transition: width 1.2s cubic-bezier(.4,0,.2,1); }

/* Export */
.rs-export { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.rs-export-header { display: flex; align-items: baseline; justify-content: space-between; }
.rs-export-title {
  display: flex; align-items: center; gap: 0.55rem;
  font-size: 0.875rem; font-weight: 600; color: var(--text);
}
.rs-export-sub { font-size: 0.75rem; color: var(--t3); }

.export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
@media (max-width: 520px) { .export-grid { grid-template-columns: 1fr; } }

.export-card {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border2); border-radius: var(--r);
  background: rgba(255,255,255,0.02);
  cursor: pointer; text-align: left; transition: all 0.2s;
}
.export-card:hover:not(:disabled) {
  border-color: var(--ind2); background: rgba(91,91,214,0.06);
  transform: translateY(-1px); box-shadow: 0 4px 16px rgba(91,91,214,0.15);
}
.export-card:disabled { opacity: 0.5; cursor: not-allowed; }

.export-answers:hover:not(:disabled) {
  border-color: var(--ok); background: rgba(61,214,140,0.05);
  box-shadow: 0 4px 16px rgba(61,214,140,0.1);
}

.export-card-icon {
  width: 38px; height: 38px; border-radius: var(--r3); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.blank-icon { background: rgba(91,91,214,0.12); color: var(--ind3); border: 1px solid rgba(91,91,214,0.2); }
.ans-icon   { background: rgba(61,214,140,0.1);  color: var(--ok);  border: 1px solid rgba(61,214,140,0.2); }

.export-card-text { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.ect-title { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.ect-sub   { font-size: 0.72rem; color: var(--t2); }

.export-dl { font-size: 1.1rem; color: var(--t2); transition: transform 0.2s; flex-shrink: 0; }
.export-card:hover .export-dl { transform: translateY(2px); color: var(--text); }

.export-note {
  font-size: 0.72rem; color: var(--t3); line-height: 1.5;
}
.export-note code {
  font-size: 0.68rem; background: var(--surface2); padding: 0.1rem 0.35rem;
  border-radius: 3px; font-family: monospace; color: var(--ind3);
}

/* Breakdown */
.rs-breakdown-head { display: flex; align-items: center; justify-content: space-between; }
.rs-bd-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; }

.breakdown-list { display: flex; flex-direction: column; gap: 0.65rem; }

.bd-row {
  overflow: hidden; transition: border-color 0.2s;
  border-left-width: 2.5px !important;
}
.bd-ok      { border-left-color: var(--ok)   !important; }
.bd-partial { border-left-color: var(--warn) !important; }
.bd-bad     { border-left-color: var(--bad)  !important; }

.bd-header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 0.9rem 1.1rem; background: none; border: none; cursor: pointer;
  gap: 0.75rem; text-align: left;
}
.bd-left {
  display: flex; align-items: center; gap: 0.55rem; flex: 1; overflow: hidden; min-width: 0;
}
.bd-indicator { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.bd-qn { font-size: 0.68rem; font-weight: 700; color: var(--t3); flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.06em; }
.bd-q  { font-size: 0.85rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bd-right { display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0; }
.bd-score { font-size: 0.78rem; font-weight: 700; }

.bd-body {
  padding: 0 1.1rem 1.1rem;
  border-top: 1px solid var(--border); padding-top: 0.9rem;
  display: flex; flex-direction: column; gap: 0.75rem;
  animation: fadeDown 0.16s ease;
}
@keyframes fadeDown { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }

.bd-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 520px) { .bd-answers { grid-template-columns: 1fr; } }

.bd-ans-row { display: flex; flex-direction: column; gap: 0.3rem; }
.bd-ans-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--t3); font-weight: 600; }
.bd-ans-val { font-size: 0.85rem; padding: 0.5rem 0.75rem; border-radius: var(--r3); line-height: 1.5; }
.user-ans { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border); }
.ok-ans   { background: rgba(61,214,140,0.07);  color: var(--ok);  border: 1px solid rgba(61,214,140,0.18); }

.bd-feedback {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.7rem 0.85rem; border-radius: var(--r3);
  font-size: 0.85rem;
}
.bd-fb-ok      { background: rgba(61,214,140,0.06);  }
.bd-fb-partial { background: rgba(245,166,35,0.06);  }
.bd-fb-bad     { background: rgba(229,72,77,0.06);   }
.bd-fb-text    { color: var(--t2); line-height: 1.55; }

.bd-strategy { font-size: 0.68rem; color: var(--t3); }
.bd-strategy code {
  background: var(--surface2); padding: 0.1rem 0.35rem;
  border-radius: 3px; font-family: monospace; font-size: 0.66rem; color: var(--ind3);
}

.rs-actions { display: flex; padding-top: 0.5rem; }
`;