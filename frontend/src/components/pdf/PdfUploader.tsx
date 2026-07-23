/* =============================================================================
   DocuMind — PDF Upload Dropzone Component
   ============================================================================= */

"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";

interface PdfUploaderProps {
  onUpload: (file: File) => Promise<unknown>;
  isUploading: boolean;
}

export default function PdfUploader({ onUpload, isUploading }: PdfUploaderProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        try {
          await onUpload(acceptedFiles[0]);
        } catch {
          // Error handled by parent hook
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? "active" : ""}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <>
          <div className="dropzone-icon">
            <Loader2 className="spinner-icon" size={28} />
          </div>
          <div className="dropzone-text">Uploading...</div>
        </>
      ) : (
        <>
          <div className="dropzone-icon">
            <UploadCloud size={28} />
          </div>
          <div className="dropzone-text">
            {isDragActive ? (
              <strong>Drop PDF here</strong>
            ) : (
              <>
                <strong>Drop PDF</strong> or click to upload
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
