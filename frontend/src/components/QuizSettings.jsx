import React, { useState } from "react";
import axios from "axios";

export default function QuizSettings({ docId, setQuiz, setQuizId, next }) {
  const [mode, setMode] = useState("mcq");
  const [difficulty, setDifficulty] = useState("mixed");
  const [prompt, setPrompt] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);

  const generateQuiz = async () => {
    if (!docId) {
      alert("No document found. Please upload a PDF first.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:8000/api/generate-quiz",
        {
          doc_id: docId,
          mode,
          difficulty,
          prompt,
          num_questions: Number(numQuestions),
        }
      );

      // ✅ Store both quiz and quizId
      setQuiz(res.data.quiz);
      setQuizId(res.data.quiz_id);

      next();
    } catch (err) {
      console.error(err);
      alert("Quiz generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Quiz Settings
      </h2>

      <div className="mb-4">
        <label className="font-semibold">Mode</label>
        <select
          className="w-full border p-2 rounded mt-1"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="mcq">MCQ</option>
          <option value="short">Short Answer</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="font-semibold">Difficulty</label>
        <select
          className="w-full border p-2 rounded mt-1"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="mixed">Mixed (3:5:2)</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="font-semibold">Number of Questions</label>
        <input
          type="number"
          min="5"
          max="50"
          className="w-full border p-2 rounded mt-1"
          value={numQuestions}
          onChange={(e) => setNumQuestions(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="font-semibold">Custom Prompt (Optional)</label>
        <textarea
          className="w-full border p-2 rounded mt-1"
          rows="3"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <button
        onClick={generateQuiz}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Quiz"}
      </button>
    </div>
  );
}
