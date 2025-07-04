import React from 'react';
import Modal from 'react-modal';
import './FilePreviewExpenseModal.css';

const FilePreviewModal = ({ isOpen, onRequestClose, filePath }) => {
  const fileExtension = filePath.split('.').pop().toLowerCase();

  const isImage = ['jpg', 'jpeg', 'png'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="file-preview-modal"
      overlayClassName="file-preview-overlay"
      contentLabel="Preview fișier"
      style={{
        content: {
          maxWidth: '90vw',
          maxHeight: '90vh',
          margin: 'auto',
          overflow: 'auto',
          borderRadius: '1rem',
          padding: '2rem',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }
      }}
    >
      <h2>Preview fișier</h2>
      <div className="preview-content">
        {isImage && (
          <img src={filePath} alt="preview" className="preview-image" />
        )}
        {isPDF && (
          <iframe src={filePath} title="PDF Preview" className="preview-pdf" />
        )}
        {!isImage && !isPDF && (
          <p>Acest fișier nu poate fi previzualizat. <a href={filePath} target="_blank" rel="noopener noreferrer">Descarcă fișierul</a>.</p>
        )}
      </div>
      <button onClick={onRequestClose} className="close-btn">Închide</button>
    </Modal>
  );
};

export default FilePreviewModal;
