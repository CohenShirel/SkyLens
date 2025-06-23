export interface SelectedFile {
  file: File;
  srtFile: File | null;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

export interface AnalysisMatrixRow {
  frame: string;
  timestamp: string;
  lat: number;
  lon: number;
  alt: number;
  is_suspicious?: boolean;
  object_in_question?: string;
  why_suspicious?: string;
}

export interface SuspiciousEvent {
  images: string[];
  object_in_question: string;
  why_suspicious: string;
  timestamp: string;
}

export interface AnalysisResult {
  result: {
    is_suspicious: boolean;
    object_in_question: string;
    why_suspicious: string;
    images?: string[]; // Optional, only present if is_suspicious is true
  };
  matrix: AnalysisMatrixRow[];
}

export type AnalysisResults = AnalysisResult[];
