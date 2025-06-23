import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnalysisResults } from "../types";
import { parseTimestampToSeconds } from "../utils";

const ResultPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { analysisResults, videoFile } = state as {
    analysisResults: AnalysisResults;
    videoFile: File;
  };

  const events = analysisResults
    .flat()
    .filter((r) => r.result.is_suspicious)
    .map((r) => ({ ...r.result, timestamp: r.matrix[0]?.timestamp ?? "00:00:00.000" }));

  const seekTo = (timestamp: string) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = parseTimestampToSeconds(timestamp);
    videoRef.current.play();
  };

  return (
    <div>
      <button onClick={() => navigate("/")}>⬅️ חזור</button>
      <video ref={videoRef} src={URL.createObjectURL(videoFile)} controls />
      {events.map((e, i) => (
        <div key={i}>
          <h3>⚠️ אירוע חשוד #{i + 1}</h3>
          <p>אובייקט: {e.object_in_question}</p>
          <p>סיבה: {e.why_suspicious}</p>
          <button onClick={() => seekTo(e.timestamp)}>הצג ({e.timestamp})</button>
        </div>
      ))}
    </div>
  );
};

export default ResultPage;
