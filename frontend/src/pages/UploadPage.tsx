import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader";
import FileItem from "../components/FileItem";
import UploadProgress from "../components/UploadProgress";
import StatsBar from "../components/StatsBar";
import Notification from "../components/Notification";
import { SelectedFile, AnalysisResults } from "../types";
import { formatFileSize } from "../utils";
import { Box, Button, Container, Typography, Paper, Divider } from "@mui/material";

const MAX_SIZE = 2 * 1024 * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/avi", "video/mov", "video/mkv"];

const UploadPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("ממתין");
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    );
    addFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE
    );
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    setSelectedFiles((prev): SelectedFile[] => [
      ...prev,
      ...files.map((file): SelectedFile => ({
        file,
        srtFile: null,
        progress: 0,
        status: "pending"
      }))
    ]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSrtChange = (index: number, srt: File | null) => {
    setSelectedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, srtFile: srt } : f))
    );
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const uploadAll = async () => {
    setUploading(true);
    setProcessingStatus("מעלה");
    let count = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      if (f.file && f.srtFile) {
        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("srt", f.srtFile);
        const res = await fetch("http://localhost:8000/analyze", { method: "POST", body: formData });
        const result: AnalysisResults = await res.json();
        count++;
        setUploadedCount(count);
        navigate("/results", { state: { analysisResults: result, videoFile: f.file } });
        break;
      }
    }
    setUploading(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, direction: 'rtl' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom align="center" color="primary">
          SkyLens ניתוח וידאו
        </Typography>

        <Divider sx={{ my: 3 }} />

        <FileUploader
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
          disabled={uploading}
          fileInputRef={fileInputRef}
          handleOpenFileDialog={handleOpenFileDialog}
        />

        <Box mt={3}>
          {selectedFiles.map((f, i) => (
            <FileItem
              key={i}
              fileData={f}
              index={i}
              disabled={uploading}
              onRemove={removeFile}
              onSrtChange={handleSrtChange}
            />
          ))}
        </Box>

        {selectedFiles.length > 0 && (
          <Box mt={4} display="flex" justifyContent="center">
            <Button variant="contained" color="primary" size="large" onClick={uploadAll} disabled={uploading}>
              🚀 העלה לניתוח
            </Button>
          </Box>
        )}

        <Box mt={5}>
          <UploadProgress visible={uploading} />
        </Box>

        <Box mt={4}>
          <StatsBar
            fileCount={selectedFiles.length}
            totalSize={formatFileSize(selectedFiles.reduce((a, b) => a + b.file.size, 0))}
            uploadedCount={uploadedCount}
            status={processingStatus}
          />
        </Box>

        <Notification message={uploading ? "קבצים מועלים..." : ""} />
      </Paper>
    </Container>
  );
};

export default UploadPage;
