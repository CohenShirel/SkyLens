import React from "react";

const FileUploader = ({
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  disabled,
  fileInputRef,
  handleOpenFileDialog
}: any) => (
  <div onClick={handleOpenFileDialog} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
    <p>העלה קובץ</p>
    <input type="file" multiple ref={fileInputRef} onChange={onFileChange} style={{ display: "none" }} disabled={disabled} />
  </div>
);

export default FileUploader;
