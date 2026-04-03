import React from "react";
import axios from "axios";

export default function Results({ results, quizId, setStep,
  setDocId,
  setQuiz,
  setQuizId,
  setResults }) {
  if (!results) return null;

  const downloadQuestions = async () => {
    const res = await axios.get(
      `http://127.0.0.1:8000/api/download/questions/${quizId}`,
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "questions.pdf";
    link.click();
  };

  const restartQuiz = () => {
  setDocId(null);
  setQuiz(null);
  setQuizId(null);
  setResults(null);
  setStep(1);
};

  const downloadAnswers = async () => {
    const res = await axios.get(
      `http://127.0.0.1:8000/api/download/answers/${quizId}`,
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "answers.pdf";
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Results</h2>

      {/* Score */}
      <div className="mb-4">
        <p className="text-xl font-semibold">
          Score: {results.score} / 100
        </p>
      </div>

      {/* Feedback */}
      <div className="mb-6 bg-gray-100 p-4 rounded">
        {results.feedback}
      </div>

      {/* Detailed Results */}
      <div className="space-y-4">
        {results.details.map((item, i) => (
          <div key={i} className="border p-4 rounded">
            <p className="font-semibold">Q{i + 1}: {item.question}</p>

            <p>
              Your Answer: <b>{item.user_answer}</b>
            </p>

            <p>
              Correct Answer: <b>{item.correct_answer}</b>
            </p>

            <p className={item.is_correct ? "text-green-600" : "text-red-600"}>
              {item.is_correct ? "✅ Correct" : "❌ Wrong"}
            </p>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={downloadQuestions}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Download Questions
        </button>

        <button
          onClick={downloadAnswers}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Download Answers
        </button>

        <button
          onClick={restartQuiz}
          className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
        Start New Quiz
        </button>
      </div>
    </div>
  );
}