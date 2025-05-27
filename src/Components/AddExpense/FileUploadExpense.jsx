import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUploadExpense.css';

const FileUploadExpense = ({ onFileSelected }) => {
  const maxSizeMB = 5;

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      alert('⚠️ Fișierul este prea mare sau are un format neacceptat (PDF, JPG, PNG, max. 5MB).');
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected]);

  const {
    getRootProps,
    getInputProps,
    acceptedFiles
  } = useDropzone({
    onDrop,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  return (
    <div {...getRootProps({ className: 'dropzone' })}>
      <input {...getInputProps()} />
      {acceptedFiles.length > 0 ? (
        <p className="uploaded-file">📎 {acceptedFiles[0].name}</p>
      ) : (
        <p className="placeholder">
          Trage fișierul aici sau apasă pentru a selecta (PDF, JPG, PNG, max. 5MB)
        </p>
      )}
    </div>
  );
};

export default FileUploadExpense;
