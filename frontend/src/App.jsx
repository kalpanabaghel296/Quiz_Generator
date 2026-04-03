import React, { useState } from "react";
import PDFUpload from "./components/PDFUpload";
import QuizSettings from "./components/QuizSettings";
import Questions from "./components/Questions";
import Results from "./components/Results";

export default function App() {
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizId, setQuizId] = useState(null); // ✅ IMPORTANT
  const [results, setResults] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {step === 1 && (
        <PDFUpload setDocId={setDocId} next={() => setStep(2)} />
      )}

      {step === 2 && (
        <QuizSettings
          docId={docId}
          setQuiz={setQuiz}
          setQuizId={setQuizId}   // ✅ PASS THIS
          next={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Questions
          quiz={quiz}
          quizId={quizId}   // ✅ PASS THIS
          setResults={setResults}
          next={() => setStep(4)}
        />
      )}

      {step === 4 && <Results
    results={results}
    quizId={quizId}
    setStep={setStep}
    setDocId={setDocId}
    setQuiz={setQuiz}
    setQuizId={setQuizId}
    setResults={setResults}
  />}
    </div>
  );
}