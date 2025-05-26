import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUploadDropzone.css';

const FileUploadDropzone = ({ onFileSelected }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]); // Trimite fișierul selectat în sus
    }
  }, [onFileSelected]);

  const {
    getRootProps,
    getInputProps,
    acceptedFiles
  } = useDropzone({ onDrop });

  return (
    <div {...getRootProps({ className: 'dropzone' })}>
      <input {...getInputProps()} />
      {acceptedFiles.length > 0 ? (
        <p className="uploaded-file">📎 {acceptedFiles[0].name}</p>
      ) : (
        <p className="placeholder">
          Trage fișierul aici sau apasă pentru a selecta (PDF, PNG, JPG, DOCX)
        </p>
      )}
    </div>
  );
};

export default FileUploadDropzone;
