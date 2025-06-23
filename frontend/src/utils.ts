export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function parseTimestampToSeconds(timestamp: string): number {
  const [h, m, s] = timestamp.split(":");
  const [sec, ms] = s.split(".");
  return Number(h) * 3600 + Number(m) * 60 + Number(sec) + (ms ? Number("0." + ms) : 0);
}
