import React, { useRef, useState, useEffect } from "react";
import { analyzeVideoAndSrt } from "./api";
import { formatFileSize } from "./utils";
import { SelectedFile, AnalysisResults, AnalysisResult, SuspiciousEvent } from "./types";
import { StackedImagesGallery } from "./components/StackedImagesGallery";
import "./App.css";


// ====== Main App ======
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_TYPES = ["video/mp4", "video/avi", "video/mov", "video/mkv"];

function App() {
  const [requestStatus, setRequestStatus] = useState<{ title: string; text: string } | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [notification, setNotification] = useState("");
  const [processingStatus, setProcessingStatus] = useState("ממתין לקבצים");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [progressBarAnim, setProgressBarAnim] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFiles.length > 0 && selectedFiles[0].file) {
      const url = URL.createObjectURL(selectedFiles[0].file);
      setVideoUrl(url);
      console.log("Video URL created:", url);
      // Cleanup function to revoke the URL when component unmounts or files change
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      console.log("Selected Files Length:", selectedFiles?.length);
      console.log("First Selected File:", selectedFiles[0]?.file);
      setVideoUrl(null);
    }
  }, [selectedFiles]);
  // Animate progress bar while uploading
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (uploading && selectedFiles.length === 2 && processingStatus === "מעלה") {
      setProgressBarAnim(0);
      interval = setInterval(() => {
        setProgressBarAnim((prev) => (prev >= 100 ? 0 : prev + 2));
      }, 40);
    } else {
      setProgressBarAnim(0);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploading, selectedFiles.length, processingStatus]);

  // Handlers for drag/drop, file select
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files = Array.from(fileList || []);
    const filteredFiles = files.filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    );
    addFiles(filteredFiles);
  };
  const addFiles = (files: File[]) => {
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.file.name + f.file.size));
      const newFiles = files.filter(
        (file) => !existing.has(file.name + file.size)
      );
      if (newFiles.length > 0) showNotification(`נוספו ${newFiles.length} קבצים לעיבוד`, "success");
      return [
        ...prev,
        ...newFiles.map((file) => ({
          file,
          srtFile: null,
          progress: 0,
          status: "pending" as const,
        })),
      ];
    });
  };
  const handleOpenFileDialog = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current?.click();
    }
  };
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    showNotification("קובץ הוסר", "info");
  };
  const handleSrtChange = (index: number, srt: File | null) => {
    setSelectedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, srtFile: srt } : f))
    );
  };

  // Upload & analyze files
  const uploadAll = async () => {
    setUploading(true);
    setRequestStatus({ title: "מעלה את הסרטון", text: "מעלה את הסרטון... נא להמתין." });
    setProcessingStatus("מעלה");
    let count = 0;

    // Start infinite progress bar animation
    setProgressBarAnim(0);
    const progressInterval = setInterval(() => {
      setProgressBarAnim((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 40);

    for (let i = 0; i < selectedFiles.length; i++) {
      setSelectedFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 0 } : f
        )
      );
      // Always get the latest file object from state
      const fileObj = selectedFiles[i];
      try {
        if (fileObj && fileObj.file && fileObj.srtFile) {
          const formData = new FormData();
          formData.append("file", fileObj.file);
          formData.append("srt", fileObj.srtFile);
          setRequestStatus({ title: "מנתח את הסרטון", text: "מנתח את הסרטון... נא להמתין." });

          const response = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const data = await response.json();
          setAnalysisResults(data);
          clearInterval(progressInterval);
          setUploading(false);
          showNotification("ניתוח הושלם בהצלחה!", "success");
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

    // Stop infinite progress bar animation
    setProgressBarAnim(100);

  };

  const resetUploader = () => {
    setSelectedFiles([]);
    setUploadedCount(0);
    setProcessingStatus("ממתין לקבצים");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const showNotification = (msg: string, type: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const totalSize = selectedFiles.length > 0 
    ? selectedFiles.reduce((sum, f) => sum + f.file.size, 0) 
    : 0;
  const handleUploadMore = () => {
    setAnalysisResults(null);
    resetUploader();
  };

  // Helper to seek video to a specific time
  const seekTo = (timestamp: string) => {
    if (!videoRef.current) return;
    const [h, m, s] = timestamp.split(":");
    const [sec, ms] = s.split(".");
    const time =
      Number(h) * 3600 +
      Number(m) * 60 +
      Number(sec) +
      (ms ? Number("0." + ms) : 0);
    videoRef.current.currentTime = time;
    videoRef.current.play();
  };

  // =========== Modern Results Page =============
// =========== Modern Results Page =============
  if (analysisResults) {
    // Process the nested array structure from the API response
    const suspiciousResults: AnalysisResult[] = [];
    
    // First flatten the nested array structure
    const flattenedResults = analysisResults.flat();
    
    // Then filter for suspicious results
    flattenedResults.forEach(item => {
      if (item.result.is_suspicious) {
        suspiciousResults.push(item);
      }
    });

    // Gather all suspicious events with timestamp
    const suspiciousEvents: SuspiciousEvent[] = suspiciousResults.map(({ result, matrix }) => ({
      images: result.images || [],
      object_in_question: result.object_in_question,
      why_suspicious: result.why_suspicious,
      timestamp: matrix[0]?.timestamp || "00:00:00.000"
    }));

    const allClear = suspiciousEvents.length === 0;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000000",
          fontFamily: "Segoe UI",
          backgroundColor: "rgb(43 43 43)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
          <div
            style={{
              display: "flex",
              flexDirection: "column",       // Ensures vertical stacking
              alignItems: "center",          // Centers horizontally
              justifyContent: "center",      // Centers vertically within its parent
              width: "100%",
              maxWidth: 1300,
              margin: "0px auto 0 auto"
            }}
          >


          {allClear ? (
            <div
              dir="rtl"
              style={{
              background: "linear-gradient(135deg, #e0f7fa, #a7ffeb)",
              borderRadius: 24,
              padding: "60px 40px",
              textAlign: "center",
              boxShadow: "0 12px 48px rgba(0, 150, 136, 0.3), 0 6px 24px rgba(0, 150, 136, 0.2)",
              marginTop: 48,
              width: "100%",
              maxWidth: 800,
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              animation: "pulseGlow 4s infinite",
              }}
            >
              <style>
              {`
                @keyframes pulseGlow {
                0% {
                  transform: scale(1);
                  box-shadow: 0 12px 48px rgba(0, 150, 136, 0.3), 0 6px 24px rgba(0, 150, 136, 0.2);
                }
                50% {
                  transform: scale(1.05);
                  box-shadow: 0 16px 56px rgba(0, 150, 136, 0.4), 0 8px 32px rgba(0, 150, 136, 0.3);
                }
                100% {
                  transform: scale(1);
                  box-shadow: 0 12px 48px rgba(0, 150, 136, 0.3), 0 6px 24px rgba(0, 150, 136, 0.2);
                }
                }
              `}
              </style>
              <div
              style={{
                fontSize: 96,
                marginBottom: 16,
                color: "#00c853",
                animation: "popIn 0.8s ease-out",
              }}
              >
              ✅
              </div>
              <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#004d40",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              }}
              >
              הכל תקין - לא נמצאו אירועים חשודים
              </div>
                <div
                style={{
                fontSize: 20,
                color: "#555",
                marginTop: 8,
                lineHeight: 1.6,
                maxWidth: 600,
                }}
                >
                המערכת לא זיהתה אף התראה או איום.<br />המשך להשתמש במערכת בבטחה.
                </div>
              <button
              onClick={handleUploadMore}
              style={{
                background: "linear-gradient(90deg, #4caf50, #388e3c)",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
                marginTop: 24,
                boxShadow: "0 4px 20px rgba(0, 150, 136, 0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                "0 6px 24px rgba(0, 150, 136, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(0, 150, 136, 0.3)";
              }}
              >
              ⬆️ העלה וידאו נוסף
              </button>
              <style>
              {`
                @keyframes popIn {
                0% {
                  transform: scale(0.8);
                  opacity: 0;
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                }
                }
              `}
              </style>
            </div>
          ) : (
            <div
              ref={el => {
              if (el) {
                el.focus();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
              }}
              tabIndex={-1}
              style={{
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: 24,
              boxShadow: "0 12px 48px rgba(255, 0, 0, 0.25)", // Updated shadow to red
              padding: "40px 36px",
              marginTop: 32,
              width: "100%",
              maxWidth: 920,
              textAlign: "center",
              backdropFilter: "blur(10px)",
              }}
            >
              <div
              style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              }}
              >
              <div
              style={{
              fontSize: 21,
              fontWeight: 700,
              color: "#d32f2f",
              display: "flex",
              alignItems: "center",
                background: "linear-gradient(90deg, #ff8a80, #ff5252)",
                padding: "16px 24px",
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(255, 0, 0, 0.3)", // Updated shadow to red
                textAlign: "center",
                animation: "pulse 1.5s infinite",
                }}
                >
                <div style={{ fontSize: 21 }}>⚠️</div>
                <div>
                {suspiciousEvents.length === 1
                ? "אירוע חשוד זוהה"
                : `${suspiciousEvents.length} אירועים חשודים זוהו`}
                </div>
                </div>
                <style>
                {`
                @keyframes pulse {
                0% {
                  transform: scale(1);
                  box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3); // Updated shadow to red
                }
                50% {
                  transform: scale(1.05);
                  box-shadow: 0 6px 24px rgba(255, 0, 0, 0.5); // Updated shadow to red
                }
                100% {
                  transform: scale(1);
                  box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3); // Updated shadow to red
                }
                }
                `}
                </style>
              </div>
              <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                position: "relative",
                width: "100%",
                maxWidth: 760,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 4px 15px rgba(255, 0, 0, 0.3), 0 4px 15px rgba(255, 0, 0, 0.2)", // Updated shadow to red
                background: "linear-gradient(145deg, #e0e0e0, #ffffff)",
                transition: "transform 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 36px rgba(255, 0, 0, 0.4), 0 6px 18px rgba(255, 0, 0, 0.25)"; // Updated shadow to red
                }}
                onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(255, 0, 0, 0.3), 0 4px 15px rgba(255, 0, 0, 0.2)"; // Updated shadow to red
                }}
              >
                <video
                ref={videoRef}
                src={videoUrl || ""}
                controls
                style={{
                width: "100%",
                height: "100%",
                display: "block",
                borderRadius: 20,
                objectFit: "cover",
                }}
                />
                <div
                style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                background: "rgba(0, 0, 0, 0.7)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(255, 0, 0, 0.3)", // Updated shadow to red
                display: "flex",
                alignItems: "center",
                gap: 6,
                }}
                >

                </div>
              </div>
              </div>
              
              <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              alignItems: "center",
              }}>
              {suspiciousEvents.map((event, idx) => (
                <div
                key={idx}
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  borderRadius: 14,
                  padding: "26px 30px",
                  marginBottom: 8,
                  width: "100%",
                  maxWidth: 600,
                  boxShadow: "0 1px 8px rgba(255, 0, 0, 0.15)", // Updated shadow to red
                }}
                >
                <div dir="rtl" style={{ 
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
                  boxShadow: "0 4px 20px rgba(255, 0, 0, 0.1)", // Updated shadow to red
                  borderRadius: 16,
                  padding: "20px 24px",
                  border: "1px solid #e0e0e0",
                }}>
                  <div style={{ 
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(90deg, #ff8a80, #ff5252)",
                  padding: "12px 16px",
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(255, 0, 0, 0.3)", // Updated shadow to red
                  }}>
                  <div style={{ 
                  fontSize: 20, 
                  fontWeight: 600, 
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  }}>
                  <div>⚠️</div>
                  <div style={{ fontWeight: "bold", fontSize: 24 }}>אירוע חשוד #{idx + 1}</div>
                  </div>
                  <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#ffffff",
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "4px 12px",
                  borderRadius: 8,
                  }}>
                  זוהה על ידי המערכת
                  </div>
                  </div>
                  
                    <div style={{ 
                    background: "#f5f5f5",
                    borderRadius: 8,
                    padding: "14px 16px",
                    }}>
                    <div style={{ 
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 20
                    }}>
                    <div style={{ color: "#a53935", fontWeight: "bold" }}>אובייקט חשוד:</div>
                    <div dir="rtl" style={{ color: "#000", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", flex: 1, textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "1px 1px", backgroundColor: "#fdd", marginLeft: 80, borderRadius: "15%" }}>
                      <div style={{ textAlign: "center", flex: 1, padding: "4px 4px",  }}>
                        {event.object_in_question}
                      </div>
                      </span>
                    </div>
                    </div>

                  <div style={{ 
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ color: "#a53935", fontWeight: "bold"}}>החשד:</div>
                                  <div dir="rtl" style={{ color: "#000", fontWeight: "bold", flex: 1, textAlign: "center" }}>
                      <span style={{ fontFamily: "Arial", display: "inline-block", borderRadius: "5%", padding: "6px 6px", backgroundColor: "#fdd" }}>
                      {event.why_suspicious}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                    <StackedImagesGallery images={event.images || []} />
                    </div>
                  </div>
                    
                  <button
                    onClick={() => {
                      seekTo(event.timestamp);
                      if (videoRef.current) {
                        videoRef.current.focus();
                      }
                    }}
                    style={{
                      background: "linear-gradient(90deg, #b71c1c, #d32f2f)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 12,
                      padding: "14px 32px",
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: "pointer",
                      marginTop: 12,
                      boxShadow: "0 4px 20px rgba(255, 0, 0, 0.25)", // Updated shadow to red
                      transition: "transform 0.2s, box-shadow 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 6px 24px rgba(255, 0, 0, 0.3)"; // Updated shadow to red
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(255, 0, 0, 0.25)"; // Updated shadow to red
                    }}
                  >
                    <span>דלג בסרטון לאירוע החשוד</span>
                    <span style={{ direction: "ltr" }}>({event.timestamp})</span>
                  </button>
                </div>
                </div>
              ))}
              </div>
              {/* Centered upload more button at the end */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
              <button
                onClick={handleUploadMore}
                style={{
                background: "linear-gradient(90deg, #ff7e5f, #feb47b)",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
                marginBottom: 0,
                boxShadow: "0 4px 20px rgba(255, 0, 0, 0.15)", // Updated shadow to red
                transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(255, 0, 0, 0.2)"; // Updated shadow to red
                }}
                onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(255, 0, 0, 0.15)"; // Updated shadow to red
                }}
              >
                ⬆️ העלה וידאו נוסף
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========== Main Upload Page =============
  return (
    <div dir="rtl" style={{ fontFamily: "Segoe UI", background: "none" }}>
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
            onClick={handleOpenFileDialog}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ cursor: uploading ? "not-allowed" : "pointer" }}
            >
            <div className="upload-icon">📹</div>
            <div className="upload-text">גרור קבצי וידאו לכאן או לחץ לבחירה</div>
            <div className="upload-subtext">
              תומך בפורמטים: MP4, AVI, MOV, MKV | גודל מקסימלי: 2GB לקובץ
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
              handleFileChange(e);
              setTimeout(() => {
                window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
                });
              }, 100); // Delay to ensure the video is loaded
              }}
              multiple
              accept="video/*"
              style={{ display: "none" }}
              disabled={uploading}
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
                    {formatFileSize(f.file.size)} •{" "}
                    {f.file.type || "וידאו"}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 600, color: "#555" }}>הוסף קובץ כתוביות (SRT):</span>
                    <div
                    style={{
                    position: "relative",
                    display: "inline-block",
                    cursor: "pointer",
                    background: "linear-gradient(90deg, #00d4ff, #00bcd4)",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                    }}
                    >
                    בחר קובץ
                    <input
                    type="file"
                    accept=".srt"
                    disabled={uploading}
                    onChange={(e) =>
                      handleSrtChange(i, e.target.files?.[0] || null)
                    }
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                    />
                    </div>
                    {f.srtFile && (
                    <span
                    style={{
                      marginRight: 8,
                      color: "#00bcd4",
                      fontWeight: 600,
                    }}
                    >
                    {f.srtFile.name}
                    </span>
                    )}
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
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <button
                className="btn btn-success"
                onClick={() => {
                  uploadAll();
                  setTimeout(() => {
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  });
                  }, 100); // Delay to ensure the upload process starts
                }}
                disabled={uploading || selectedFiles.length === 0}
                style={{
                  background: "linear-gradient(90deg, #4caf50, #388e3c)",
                  color: "#fff",
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
                >
                🚀 העלה את כל הקבצים לניתוח
                </button>
              </div>
            </div>
          )}
        </div>
        {uploading && requestStatus &&  (
          <div className="progress-section" style={{ display: "block" }}>
            <h2 className="section-title">⏳ {requestStatus.title}</h2>
            <div>
              {/* Modern infinite progress bar */}
              <div
                style={{
                  width: 320,
                  height: 14,
                  background: "#e0e0e0",
                  borderRadius: 10,
                  overflow: "hidden",
                  margin: "32px auto 0 auto",
                  position: "relative",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "40%",
                    background: "linear-gradient(90deg, #00d4ff 0%, #00bcd4 100%)",
                    borderRadius: 10,
                    animation: "infiniteBarAnim 1.2s cubic-bezier(.4,0,.2,1) infinite"
                  }}
                />
                <style>
                  {`
                    @keyframes infiniteBarAnim {
                      0% { left: -40%; width: 40%; }
                      50% { left: 30%; width: 60%; }
                      100% { left: 100%; width: 40%; }
                    }
                  `}
                </style>
              </div>
              <div style={{ textAlign: "center", marginTop: 18, color: "#00bcd4", fontWeight: 500, fontSize: 16 }}>
                  {requestStatus.text}
              </div>
            </div>
          </div>
        )}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-number">{processingStatus}</div>
            <div className="stat-label">סטטוס עיבוד</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{formatFileSize(totalSize)}</div>
            <div className="stat-label">סך הכל נתונים</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{selectedFiles.length}</div>
            <div className="stat-label">קבצים נבחרים</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{uploadedCount}</div>
            <div className="stat-label">הועלו בהצלחה</div>
          </div>

        </div>
      </div>
      {notification && (
        <div className="notification" style={{ display: "block" }}>
          {notification}
        </div>
      )}
      {uploading && selectedFiles.length === 2 && processingStatus === "מעלה" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.85)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.13)",
              padding: "2.5rem 2.5rem 2rem 2.5rem",
              minWidth: 340,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px solid #e0e0e0",
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 16, color: "#00bcd4" }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
              מעבד את הקבצים שלך...
            </div>
            <div style={{ color: "#888", marginBottom: 22, fontSize: 15 }}>
              אנא המתן, התהליך עשוי להימשך מספר רגעים.
            </div>
            <div style={{
              width: 240,
              height: 12,
              background: "#e0e0e0",
              borderRadius: 8,
              overflow: "hidden",
              margin: "0 auto",
              marginBottom: 8,
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
            }}>
              <div style={{
                height: "100%",
                width: `${progressBarAnim}%`,
                background: "linear-gradient(90deg, #00d4ff 0%, #00bcd4 100%)",
                borderRadius: 8,
                transition: "width 0.2s",
                minWidth: 40,
                maxWidth: "100%"
              }} />
            </div>
            <div style={{ color: "#00bcd4", fontWeight: 500, fontSize: 15 }}>
              {progressBarAnim < 100 ? "מעבד..." : "כמעט סיימנו..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
