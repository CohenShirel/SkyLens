import React from "react";

const FileItem = ({ fileData, index, disabled, onRemove, onSrtChange }: any) => (
  <div>
    <p>{fileData.file.name}</p>
    <input type="file" accept=".srt" onChange={(e) => onSrtChange(index, e.target.files?.[0] || null)} disabled={disabled} />
    <button onClick={() => onRemove(index)} disabled={disabled}>הסר</button>
  </div>
);

export default FileItem;
