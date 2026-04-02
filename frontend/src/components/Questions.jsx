import React, { useState } from "react";
import { gradeAnswers } from "../services/api.js";

export default function Questions({ quiz, quizId, setResults, next }) {
  const [answers, setAnswers] = useState({});

  // Handle input change
  const handleChange = (index, value) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  // Submit answers
 const handleSubmit = async () => {
  try {
    const formattedAnswers = quiz.map((q, index) => ({
      question: q.question,
      user_answer: answers[index] || "",
    }));

    console.log("quizId:", quizId);
    console.log("formattedAnswers:", formattedAnswers);

    const res = await gradeAnswers({
      quiz_id: quizId,
      answers: formattedAnswers,
    });

    setResults(res.data);
    next();
  } catch (err) {
    console.error(err);
    alert("Failed to grade answers");
  }
};

  if (!quiz) {
    return <div className="text-center mt-10">No quiz available</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Answer the Questions
      </h2>

      {quiz.map((q, index) => (
        <div key={index} className="mb-6">
          <p className="font-semibold mb-2">
            {index + 1}. {q.question}
          </p>

          {/* MCQ */}
          {q.options && q.options.length > 0 ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <label key={i} className="block">
                  <input
                    type="radio"
                    name={`q-${index}`}
                    value={opt}
                    onChange={(e) => handleChange(index, e.target.value)}
                    className="mr-2"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            // Short answer
            <input
              type="text"
              placeholder="Your answer..."
              className="w-full border p-2 rounded"
              onChange={(e) => handleChange(index, e.target.value)}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Submit Answers
      </button>
    </div>
  );
}