import React, { useState } from "react";
import axios from "axios";

export default function Results({ results, quizId }) {
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // 🔥 Debug (VERY IMPORTANT)
  console.log("Results quizId:", quizId);

  if (!results) {
    return (
      <div className="text-center mt-10 text-gray-600">
        No results available.
      </div>
    );
  }

  // ✅ Download PDF
  const handleDownload = async () => {
    if (!quizId) {
      alert("Quiz ID missing. Please regenerate quiz.");
      return;
    }

    try {
      setDownloading(true);

      const response = await axios.get(
        `http://127.0.0.1:8000/api/download/${quizId}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "quiz-results.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  // ✅ Regenerate Quiz
  const handleRegenerate = async () => {
    try {
      setRegenerating(true);

      // ⚠️ You MUST send full data (backend requirement)
      const docId = localStorage.getItem("doc_id");

if (!docId) {
  alert("Document missing. Please upload again.");
  return;
}

await axios.post("http://127.0.0.1:8000/api/regenerate", {
  doc_id: docId,
  mode: "mcq",
  difficulty: "mixed",
  prompt: "",
  num_questions: 10,
});

      alert("Quiz regenerated! Please go back and generate again.");
    } catch (err) {
      console.error(err);
      alert("Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6">
        Quiz Results
      </h2>

      {/* Score */}
      <div className="bg-green-100 p-6 rounded-lg text-center mb-6">
        <p className="text-xl font-semibold">Your Score</p>
        <p className="text-4xl font-bold text-green-700">
          {results.score} / 100
        </p>
      </div>

      {/* Feedback */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-2">Feedback</h3>
        <div className="bg-gray-100 p-4 rounded">
          {results.feedback}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {downloading ? "Downloading..." : "Download PDF"}
        </button>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {regenerating ? "Regenerating..." : "Regenerate Quiz"}
        </button>
      </div>
    </div>
  );
}