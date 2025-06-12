import { User, FileUploadResponse } from "./types";

const API_URL = "http://localhost:8000";

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function addUser(user: User): Promise<User> {
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error("Failed to add user");
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete user");
}

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/uploadfile`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload file");
  return res.json();
}

export async function downloadFile(filename: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/downloadfile/${filename}`);
  if (!res.ok) throw new Error("Failed to download file");
  return res.blob();
}

// Add this function to call the /analyze endpoint and open the result page
export async function analyzeVideoAndSrt(video: File, srt: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", video);
  formData.append("srt", srt);
  const res = await fetch("http://localhost:8000/analyze", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Analysis failed");
  const data = await res.json();
  return data.result_url; // e.g. /result/filename_result.json
}
