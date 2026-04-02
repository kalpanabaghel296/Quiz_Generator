import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

export default function PDFUpload({ setDocId, next }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("File too large (Max 100MB)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:8000/api/upload-pdf",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      localStorage.setItem("doc_id", res.data.doc_id);
      setDocId(res.data.doc_id);
      setPreview(res.data.preview);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [] },
    onDrop,
  });

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Upload PDF to Generate Quiz
      </h2>

      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-400 p-10 text-center cursor-pointer rounded-lg"
      >
        <input {...getInputProps()} />
        {loading ? (
          <p className="text-blue-600 font-semibold">Processing PDF...</p>
        ) : (
          <p>Drag & drop a PDF here, or click to select</p>
        )}
      </div>

      {preview && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Preview:</h3>
          <div className="bg-gray-100 p-4 rounded h-40 overflow-y-scroll text-sm">
            {preview}
          </div>

          <button
            onClick={next}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Continue to Quiz Settings
          </button>
        </div>
      )}
    </div>
  );
}
