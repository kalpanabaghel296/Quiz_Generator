import { useState } from "react";
import UploadPage from "./components/UploadPage";
import ConfigPage from "./components/ConfigPage";
import QuizPage from "./components/QuizPage";
import ResultsPage from "./components/ResultPage";

const STEPS = ["Upload", "Configure", "Quiz", "Results"];
const SCREEN_STEP = { upload: 0, config: 1, quiz: 2, results: 3 };

export default function App() {
  const [screen, setScreen]           = useState("upload");
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName]       = useState("");
  const [docId, setDocId]             = useState("");
  const [questions, setQuestions]     = useState([]);
  const [gradingResult, setGradingResult] = useState(null);

  const go = (s) => setScreen(s);

  const handleUploadDone = ({ text, name, docId: id }) => {
    setExtractedText(text); setFileName(name); setDocId(id); go("config");
  };
  const handleQuizGenerated = (qs) => { setQuestions(qs); go("quiz"); };
  const handleQuizSubmitted = (r)  => { setGradingResult(r); go("results"); };
  const handleRestart = () => {
    setExtractedText(""); setFileName(""); setDocId("");
    setQuestions([]); setGradingResult(null); go("upload");
  };

  const step = SCREEN_STEP[screen] ?? 0;

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── Noise texture overlay ── */}
      <div className="noise" aria-hidden="true" />

      {/* ── Top navigation bar ── */}
      <header className="navbar">
        <div className="navbar-inner">
          <div className="nav-brand">
            <div className="nav-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="nav-name">EduQuiz</span>
            <span className="nav-badge">AI</span>
          </div>

          {/* Step indicator */}
          <nav className="nav-steps" aria-label="Progress">
            {STEPS.map((label, i) => (
              <div key={label} className={`nav-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <span className="step-dot">
                  {i < step ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="step-num">{i + 1}</span>
                  )}
                </span>
                <span className="step-label">{label}</span>
                {i < STEPS.length - 1 && <span className="step-line" />}
              </div>
            ))}
          </nav>

          <div className="nav-right">
            <a href="https://github.com/kalpanabaghel296/Quiz_Generator" className="nav-link" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Docs
            </a>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="main">
        {screen === "upload"  && <UploadPage onDone={handleUploadDone} />}
        {screen === "config"  && <ConfigPage extractedText={extractedText} fileName={fileName} docId={docId} onQuizGenerated={handleQuizGenerated} onBack={() => go("upload")} />}
        {screen === "quiz"    && <QuizPage questions={questions} onSubmit={handleQuizSubmitted} onBack={() => go("config")} />}
        {screen === "results" && <ResultsPage result={gradingResult} questions={questions} onRestart={handleRestart} />}
      </main>
    </>
  );
}

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Palette */
  --bg:       #080810;
  --bg2:      #0e0e1a;
  --bg3:      #13131f;
  --surface:  rgba(255,255,255,0.032);
  --surface2: rgba(255,255,255,0.06);
  --border:   rgba(255,255,255,0.065);
  --border2:  rgba(255,255,255,0.12);

  /* Accent — cold indigo */
  --ind:   #5b5bd6;
  --ind2:  #7878e0;
  --ind3:  #ababf0;

  /* Semantic */
  --text:  #e8e8f4;
  --t2:    #8888aa;
  --t3:    #44445a;
  --ok:    #3dd68c;
  --warn:  #f5a623;
  --bad:   #e5484d;

  /* Radii */
  --r:  12px;
  --r2:  8px;
  --r3:  6px;

  /* Typography */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body:    'Geist', system-ui, sans-serif;
}

html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

button { font-family: inherit; cursor: pointer; border: none; }
textarea, input { font-family: inherit; }
a { text-decoration: none; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

/* ── Noise texture ── */
.noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 100;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px 128px;
}

/* ── Grid background ── */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%);
}

/* ── Navbar ── */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: rgba(8,8,16,0.82);
  backdrop-filter: blur(20px) saturate(1.4);
}

.navbar-inner {
  max-width: 1180px; margin: 0 auto; height: 100%;
  display: flex; align-items: center; gap: 2rem; padding: 0 1.5rem;
}

.nav-brand {
  display: flex; align-items: center; gap: 0.55rem;
  flex-shrink: 0;
}

.nav-logo {
  width: 30px; height: 30px; border-radius: var(--r3);
  background: linear-gradient(135deg, var(--ind) 0%, var(--ind2) 100%);
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 0 16px rgba(91,91,214,0.4);
}

.nav-name {
  font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em;
  color: var(--text);
}

.nav-badge {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em;
  background: rgba(91,91,214,0.18); color: var(--ind3);
  border: 1px solid rgba(91,91,214,0.25);
  padding: 0.15rem 0.45rem; border-radius: 100px;
}

/* ── Step indicator ── */
.nav-steps {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 0;
}

.nav-step {
  display: flex; align-items: center; gap: 0;
  opacity: 0.35; transition: opacity 0.3s;
}
.nav-step.active { opacity: 1; }
.nav-step.done   { opacity: 0.6; }

.step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 600; color: var(--t2);
  transition: all 0.3s; flex-shrink: 0;
  background: var(--bg2);
}
.nav-step.active .step-dot {
  border-color: var(--ind2); background: rgba(91,91,214,0.2); color: var(--ind3);
  box-shadow: 0 0 12px rgba(91,91,214,0.35);
}
.nav-step.done .step-dot {
  border-color: var(--ok); background: rgba(61,214,140,0.12); color: var(--ok);
}

.step-label {
  font-size: 0.72rem; font-weight: 500; color: var(--t2);
  margin-left: 0.45rem; white-space: nowrap;
}
.nav-step.active .step-label { color: var(--text); font-weight: 600; }
.nav-step.done .step-label   { color: var(--ok); }

.step-line {
  display: block; width: 32px; height: 1px;
  background: var(--border2); margin: 0 0.6rem;
}

@media (max-width: 640px) {
  .step-label { display: none; }
  .step-line  { width: 18px; margin: 0 0.3rem; }
}

.nav-right { flex-shrink: 0; display: flex; align-items: center; }

.nav-link {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.8rem; color: var(--t2); font-weight: 500;
  padding: 0.35rem 0.8rem; border-radius: var(--r3);
  border: 1px solid var(--border); background: var(--surface);
  transition: all 0.2s;
}
.nav-link:hover { color: var(--text); border-color: var(--border2); background: var(--surface2); }

/* ── Main content area ── */
.main {
  padding-top: 56px; /* navbar height */
  min-height: 100vh;
  position: relative; z-index: 1;
}

/* ── Shared page wrapper ── */
.page {
  min-height: calc(100vh - 56px);
  display: flex; flex-direction: column; align-items: center;
  padding: 3.5rem 1.5rem 6rem;
}

.wrap {
  width: 100%;
  position: relative; z-index: 1;
}

/* ── Ambient glow ── */
.glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.glow-a {
  position: absolute;
  width: 800px; height: 600px;
  background: radial-gradient(ellipse, rgba(91,91,214,0.09) 0%, transparent 60%);
  top: -200px; left: 50%; transform: translateX(-50%);
}
.glow-b {
  position: absolute;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(61,214,140,0.05) 0%, transparent 60%);
  bottom: 0; right: -150px;
}

/* ── Card ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  backdrop-filter: blur(20px);
}
.card-elevated {
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  box-shadow: 0 4px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset;
}

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.75rem 1.5rem; border-radius: var(--r2);
  font-size: 0.875rem; font-weight: 600; letter-spacing: -0.005em;
  transition: all 0.18s cubic-bezier(.4,0,.2,1);
  width: 100%; cursor: pointer;
}

.btn-primary {
  background: var(--ind);
  color: #fff;
  border: 1px solid rgba(120,120,224,0.4);
  box-shadow: 0 2px 16px rgba(91,91,214,0.28), inset 0 1px 0 rgba(255,255,255,0.12);
}
.btn-primary:hover:not(:disabled) {
  background: var(--ind2);
  box-shadow: 0 4px 24px rgba(91,91,214,0.42), inset 0 1px 0 rgba(255,255,255,0.12);
  transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

.btn-secondary {
  background: var(--surface2);
  color: var(--t2);
  border: 1px solid var(--border2);
  width: auto;
}
.btn-secondary:hover { color: var(--text); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); }

.btn-ghost {
  background: transparent; border: 1px solid var(--border);
  color: var(--t3); padding: 0.4rem 0.85rem;
  font-size: 0.8rem; font-weight: 500;
  border-radius: var(--r3); width: auto;
}
.btn-ghost:hover { border-color: var(--border2); color: var(--t2); background: var(--surface); }

/* ── Tags ── */
.tag {
  display: inline-flex; align-items: center;
  padding: 0.2rem 0.65rem; border-radius: 100px;
  font-size: 0.64rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
}
.tag-ind  { background: rgba(91,91,214,0.12);  color: var(--ind3);  border: 1px solid rgba(91,91,214,0.22); }
.tag-ok   { background: rgba(61,214,140,0.1);  color: var(--ok);   border: 1px solid rgba(61,214,140,0.2); }
.tag-warn { background: rgba(245,166,35,0.1);  color: var(--warn); border: 1px solid rgba(245,166,35,0.2); }
.tag-bad  { background: rgba(229,72,77,0.1);   color: var(--bad);  border: 1px solid rgba(229,72,77,0.2); }
.tag-neu  { background: rgba(255,255,255,0.06); color: var(--t2);  border: 1px solid var(--border2); }

/* ── Error ── */
.err-box {
  background: rgba(229,72,77,0.08); border: 1px solid rgba(229,72,77,0.2);
  color: var(--bad); padding: 0.75rem 1rem; border-radius: var(--r2);
  font-size: 0.85rem; line-height: 1.55;
}

/* ── Spinner ── */
.spin {
  display: inline-block; width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.18); border-top-color: #fff;
  border-radius: 50%; animation: rot 0.55s linear infinite;
}
@keyframes rot { to { transform: rotate(360deg); } }

/* ── Gradient text ── */
.grad {
  background: linear-gradient(135deg, #fff 0%, var(--ind3) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ── Divider ── */
.divider { height: 1px; background: var(--border); }

/* ── Input / textarea shared ── */
.field {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: var(--r2); color: var(--text);
  font-size: 0.875rem; outline: none; transition: border-color 0.18s;
}
.field:focus { border-color: var(--ind2); background: rgba(91,91,214,0.04); }
.field::placeholder { color: var(--t3); }
`;