import React from "react";

const StatsBar = ({ fileCount, totalSize, uploadedCount, status }: any) => (
  <div>
    <p>קבצים: {fileCount}</p>
    <p>גודל כולל: {totalSize}</p>
    <p>הועלו: {uploadedCount}</p>
    <p>סטטוס: {status}</p>
  </div>
);

export default StatsBar;
