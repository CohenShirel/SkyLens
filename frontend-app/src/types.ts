// Types for User and File Upload
export interface User {
  id: number;
  name: string;
  age?: number;
}

export interface FileUploadResponse {
  filename: string;
  detail: string;
  content: string; // Use string for content, as FastAPI returns base64 or utf-8 string
}
