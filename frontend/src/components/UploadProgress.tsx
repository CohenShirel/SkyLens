import React from "react";

interface Props {
  visible: boolean;
  progress?: number;
}

const UploadProgress: React.FC<Props> = ({ visible }) =>
  visible ? (
    <div className="progress-section">
      <h2 className="section-title">⏳ התקדמות העלאה</h2>
      <div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" />
        </div>
        <div className="progress-text">
          העלאה מתבצעת... אנא המתן לסיום התהליך
        </div>
      </div>
    </div>
  ) : null;

export default UploadProgress;
