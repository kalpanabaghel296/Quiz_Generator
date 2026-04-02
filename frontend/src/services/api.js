import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Upload PDF
export const uploadPDF = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/api/upload-pdf", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Generate Quiz
export const generateQuiz = (data) => {
  return API.post("/api/generate-quiz", data);
};

// Grade Answers
export const gradeAnswers = (data) => {
  return API.post("/api/grade-answers", data);
};