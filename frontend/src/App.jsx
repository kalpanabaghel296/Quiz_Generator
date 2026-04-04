import { useState } from "react";
import UploadPage from "./components/UploadPage";
import ConfigPage from "./components/ConfigPage";
import QuizPage from "./components/QuizPage";
import ResultsPage from "./components/ResultPage";

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [docId, setDocId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [gradingResult, setGradingResult] = useState(null);

  const go = (s) => setScreen(s);

  const handleUploadDone = ({ text, name, docId: id }) => {
    setExtractedText(text);
    setFileName(name);
    setDocId(id);
    go("config");
  };

  const handleQuizGenerated = (qs) => {
    setQuestions(qs);
    go("quiz");
  };

  const handleQuizSubmitted = (result) => {
    setGradingResult(result);
    go("results");
  };

  const handleRestart = () => {
    setExtractedText(""); setFileName(""); setDocId("");
    setQuestions([]); setGradingResult(null);
    go("upload");
  };

  return (
    <>
      <style>{globalCSS}</style>
      {screen === "upload"  && <UploadPage onDone={handleUploadDone} />}
      {screen === "config"  && <ConfigPage extractedText={extractedText} fileName={fileName} docId={docId} onQuizGenerated={handleQuizGenerated} onBack={() => go("upload")} />}
      {screen === "quiz"    && <QuizPage questions={questions} onSubmit={handleQuizSubmitted} onBack={() => go("config")} />}
      {screen === "results" && <ResultsPage result={gradingResult} questions={questions} onRestart={handleRestart} />}
    </>
  );
}

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #06060f;
  --bg2: #0c0c1e;
  --surface: rgba(255,255,255,0.035);
  --surface-h: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.07);
  --border-h: rgba(255,255,255,0.13);
  --v: #7c6ef7;
  --v2: #a89cf8;
  --v3: #c9beff;
  --teal: #2dd4bf;
  --pink: #f472b6;
  --text: #eeeef8;
  --t2: #9898b8;
  --muted: #52527a;
  --ok: #34d399;
  --warn: #fbbf24;
  --bad: #fb7185;
  --r: 14px;
  --r2: 10px;
}

html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

button { font-family: inherit; cursor: pointer; border: none; }
textarea, input { font-family: inherit; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: var(--border-h); border-radius: 3px; }

/* ── Layout */
.page {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center;
  padding: 2.5rem 1rem 6rem;
  position: relative;
}

.wrap { position: relative; z-index: 1; width: 100%; }

/* ── Ambient glow */
.ambient {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.ambient-a {
  position: absolute; width: 700px; height: 500px;
  background: radial-gradient(ellipse, rgba(124,110,247,0.11) 0%, transparent 65%);
  top: -180px; left: 50%; transform: translateX(-50%);
}
.ambient-b {
  position: absolute; width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(45,212,191,0.07) 0%, transparent 65%);
  bottom: -100px; right: -80px;
}
.ambient-c {
  position: absolute; width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 65%);
  top: 40%; left: -80px;
}

/* ── Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  backdrop-filter: blur(16px);
}

/* ── Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  border-radius: var(--r2);
  font-size: 0.925rem; font-weight: 700;
  transition: all 0.22s cubic-bezier(.4,0,.2,1);
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #6c5ce7 0%, #7c6ef7 40%, #a89cf8 100%);
  color: #fff;
  box-shadow: 0 4px 24px rgba(108,92,231,0.32), inset 0 1px 0 rgba(255,255,255,0.15);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 36px rgba(108,92,231,0.48), inset 0 1px 0 rgba(255,255,255,0.15);
}
.btn-primary:disabled { opacity: 0.38; cursor: not-allowed; transform: none; }

.btn-outline {
  background: var(--surface);
  border: 1px solid var(--border-h);
  color: var(--t2);
  width: auto;
}
.btn-outline:hover { color: var(--text); border-color: var(--v2); background: var(--surface-h); }

.btn-ghost {
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); padding: 0.45rem 0.9rem;
  font-size: 0.82rem; font-weight: 500;
  border-radius: var(--r2); width: auto;
}
.btn-ghost:hover { border-color: var(--border-h); color: var(--t2); }

/* ── Pill tags */
.tag {
  display: inline-flex; align-items: center;
  padding: 0.18rem 0.6rem; border-radius: 100px;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
}
.tag-v    { background: rgba(124,110,247,0.15); color: var(--v2); border: 1px solid rgba(124,110,247,0.2); }
.tag-teal { background: rgba(45,212,191,0.1);   color: var(--teal); border: 1px solid rgba(45,212,191,0.2); }
.tag-pink { background: rgba(244,114,182,0.1);  color: var(--pink); border: 1px solid rgba(244,114,182,0.2); }
.tag-ok   { background: rgba(52,211,153,0.1);   color: var(--ok);  border: 1px solid rgba(52,211,153,0.2); }
.tag-bad  { background: rgba(251,113,133,0.1);  color: var(--bad); border: 1px solid rgba(251,113,133,0.2); }
.tag-warn { background: rgba(251,191,36,0.1);   color: var(--warn); border: 1px solid rgba(251,191,36,0.2); }

/* ── Error box */
.err-box {
  background: rgba(251,113,133,0.08); border: 1px solid rgba(251,113,133,0.2);
  color: var(--bad); padding: 0.8rem 1rem; border-radius: var(--r2);
  font-size: 0.875rem; line-height: 1.5;
}

/* ── Spinner */
.spin {
  display: inline-block; width: 17px; height: 17px;
  border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
  border-radius: 50%; animation: rot 0.6s linear infinite;
}
@keyframes rot { to { transform: rotate(360deg); } }

/* ── Gradient text */
.grad-text {
  background: linear-gradient(135deg, var(--v2) 0%, var(--teal) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
`;