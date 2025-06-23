

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
