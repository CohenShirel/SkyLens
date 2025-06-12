import React, { useRef, useState,useEffect } from "react";
import { uploadFile, analyzeVideoAndSrt } from "./api";
import "./App.css";

interface SelectedFile {
  file: File;
  srtFile: File | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_TYPES = ["video/mp4", "video/avi", "video/mov", "video/mkv"];
var data1 ;
function App() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [notification, setNotification] = useState("");
  const [processingStatus, setProcessingStatus] = useState("ממתין");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisResults, setAnalysisResults] = useState(null);



  useEffect(() => {
  if (analysisResults) {
    console.log("Analysis results updated:", analysisResults);
  }
}, [analysisResults]);
  // Initialize with an empty array
  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    );
    addFiles(files);
  };

  // File input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    );
    addFiles(files);
  };

  // Add files to state
  const addFiles = (files: File[]) => {
    setSelectedFiles((prev) => {
      // Prevent duplicates by checking both name and size
      const existing = new Set(prev.map(f => f.file.name + f.file.size));
      const newFiles = files.filter(
        (file) => !existing.has(file.name + file.size)
      );
      if (newFiles.length > 0) {
        showNotification(`נוספו ${newFiles.length} קבצים לעיבוד`, "success");
      }
      return [
        ...prev,
        ...newFiles.map((file) => ({ file, srtFile: null, progress: 0, status: "pending" as const })),
      ];
    });
  };

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    showNotification("קובץ הוסר", "info");
  };

  // SRT file change handler
  const handleSrtChange = (index: number, srt: File | null) => {
    setSelectedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, srtFile: srt } : f))
    );
  };

  // Upload all files
  const uploadAll = async () => {
    setUploading(true);
    setProcessingStatus("מעלה");
    let count = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      setSelectedFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 0 } : f
        )
      );
      // Always get the latest file object from state
      const getLatestFile = () => {
        return (typeof setSelectedFiles === 'function')
          ? (prev => prev[i])(selectedFiles)
          : selectedFiles[i];
      };
      try {
        const fileObj = getLatestFile();
        if (fileObj && fileObj.file && fileObj.srtFile) {
          await analyzeVideoAndSrt(fileObj.file, fileObj.srtFile);
        } else if (fileObj && fileObj.file) {
          await uploadVideoAndSrt(fileObj.file, fileObj.srtFile, (prog) => {
            setSelectedFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, progress: prog } : f
              )
            );
          });
        }
        setSelectedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done", progress: 100 } : f
          )
        );
        count++;
        setUploadedCount(count);
      } catch {
        setSelectedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" } : f
          )
        );
      }
    }
    // Remove the following incorrect fetch block and fileObj usage
    // The upload for each file is already handled in the loop above
    // If you want to send a fetch request here, you must use the correct file object and FormData
    // Example for the last file processed (not recommended for all files, just for demo):
    const lastFileObj = selectedFiles[selectedFiles.length - 1];
    if (lastFileObj && lastFileObj.file && lastFileObj.srtFile) {
      const formData = new FormData();
      formData.append("file", lastFileObj.file);
      formData.append("srt", lastFileObj.srtFile);
      fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      })
        .then(response => {
          const result = response.json()
          console.log("Analysis result:", result);
          return result;
        })
        .then(data => {
          console.log("Analysis completed:", data);
          setAnalysisResults(data);
          showNotification("ניתוח הושלם בהצלחה!", "success");

        });
    }
    console.log("data1:",analysisResults);
    setProcessingStatus("הושלם");
    showNotification("כל הקבצים הועלו בהצלחה!", "success");
    setTimeout(resetUploader, 3000);
    setUploading(false);
  };

  // Upload video and srt together
  const uploadVideoAndSrt = (video: File, srt: File | null, onProgress: (prog: number) => void) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", video);
      if (srt) formData.append("srt", srt);
      xhr.open("POST", "http://localhost:8000/uploadfile");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) resolve(xhr.response);
        else reject();
      };
      xhr.onerror = reject;
      xhr.send(formData);
    });
  };

  // Reset uploader
  const resetUploader = () => {
    setSelectedFiles([]);
    setUploadedCount(0);
    setProcessingStatus("ממתין");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Notification
  const showNotification = (msg: string, type: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Stats
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div dir="rtl" style={{ fontFamily: 'Segoe UI', background: 'none' }}>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🎯</div>
            <div>
              <div className="logo-text">SkyLens</div>
              <div className="logo-subtitle">מערכת ניתוח וידאו מתקדמת</div>
            </div>
          </div>
          <div className="status-indicators">
            <div className="status-item">
              <div className="status-dot"></div>
              <span>מערכת פעילה</span>
            </div>
            <div className="status-item">
              <span>מחובר</span>
            </div>
          </div>
        </div>
      </header>
      <div className="main-container">
        <div className="upload-section">
          <h2 className="section-title">📁 העלאת קבצי וידאו לניתוח</h2>
          <div
            className="upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: uploading ? "not-allowed" : "pointer" }}
          >
            <div className="upload-icon">📹</div>
            <div className="upload-text">גרור קבצי וידאו לכאן או לחץ לבחירה</div>
            <div className="upload-subtext">תומך בפורמטים: MP4, AVI, MOV, MKV | גודל מקסימלי: 2GB לקובץ</div>
            <input
              type="file"
              className="file-input"
              ref={fileInputRef}
              multiple
              accept="video/*"
              disabled={uploading}
              onChange={handleFileChange}
              style={{ display: "block" }}
            />
          </div>
          {selectedFiles.length > 0 && (
            <div className="file-list" style={{ display: "block" }}>
              <h3 className="section-title">📋 קבצים נבחרים</h3>
              <div>
                {selectedFiles.map((f, i) => (
                  <div className="file-item" key={i}>
                    <div className="file-info">
                      <div className="file-icon">🎬</div>
                      <div className="file-details">
                        <div className="file-name">{f.file.name}</div>
                        <div className="file-meta">
                          {formatFileSize(f.file.size)} • {f.file.type || "וידאו"}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <label>
                            <span>הוסף קובץ כתוביות (SRT): </span>
                            <input
                              type="file"
                              accept=".srt"
                              disabled={uploading}
                              onChange={e => handleSrtChange(i, e.target.files?.[0] || null)}
                            />
                            {f.srtFile && <span style={{ marginRight: 8, color: '#00d4ff' }}>{f.srtFile.name}</span>}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => removeFile(i)}
                        disabled={uploading}
                      >
                        🗑️ הסר
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-success"
                onClick={uploadAll}
                disabled={uploading || selectedFiles.length === 0}
              >
                🚀 העלה את כל הקבצים לניתוח
              </button>
            </div>
          )}
        </div>
        {uploading && (
          <div className="progress-section" style={{ display: "block" }}>
            <h2 className="section-title">⏳ התקדמות העלאה</h2>
            <div>
              {selectedFiles.map((f, i) => (
                <div className="progress-item" key={i}>
                  <div className="progress-header">
                    <span>{f.file.name}</span>
                    <span>
                      {f.status === "done"
                        ? "✅ הושלם"
                        : f.status === "error"
                          ? "❌ שגיאה"
                          : `${f.progress}%`}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${f.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-number">{selectedFiles.length}</div>
            <div className="stat-label">קבצים נבחרים</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{formatFileSize(totalSize)}</div>
            <div className="stat-label">סך הכל נתונים</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{uploadedCount}</div>
            <div className="stat-label">הועלו בהצלחה</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{processingStatus}</div>
            <div className="stat-label">סטטוס עיבוד</div>
          </div>
        </div>
      </div>
      {notification && (
        <div className="notification" style={{ display: "block" }}>{notification}</div>
      )}
      {analysisResults && (
        <div className="analysis-results" style={{ display: "block" }}>
          <h2 className="section-title">📊 תוצאות ניתוח</h2>
          <pre>{JSON.stringify(analysisResults, null, 2)}</pre>
        </div>
      )}

    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default App;
