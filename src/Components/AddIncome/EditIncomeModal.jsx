import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiX } from 'react-icons/fi';
import './EditIncomeModal.css';
import axios from 'axios';
import FileUploadDropzone from './FileUploadDropzone';
import FilePreviewModal from './FilePreviewModal';

const EditIncomeModal = ({ isOpen, onRequestClose, income, onSave }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [filePath, setFilePath] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (income) {
      setName(income.name || '');
      setAmount(income.amount || '');
      setDate(income.date ? new Date(income.date) : new Date());
      setFilePath(income.file_path || null);
      setSelectedFile(null);
    }
  }, [income]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await onSave({ ...income, name, amount, date });

    if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(`/api/incomes/upload/${income.id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          'Content-Type': 'multipart/form-data'
        }
      });
    }

    onRequestClose();
  };

  const handleDeleteFile = async () => {
    try {
      await axios.delete(`/api/incomes/${income.id}/remove-file`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      setFilePath(null);
      setSelectedFile(null);
      alert("Fișierul a fost șters cu succes.");
    } catch (err) {
      console.error("❌ Eroare la ștergerea fișierului:", err);
      alert("Eroare la ștergerea fișierului.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Editează Venit"
      className="modal-content"
      overlayClassName="modal-overlay"
    >
      <div className="modal-header">
        <h2>Editează Venitul</h2>
        <button className="modal-close" onClick={onRequestClose}>
          <FiX />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="modal-form">
        <input
          type="text"
          placeholder="Nume venit"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Sumă"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <DatePicker
          selected={date}
          onChange={(date) => setDate(date)}
          dateFormat="dd/MM/yyyy"
          className="modal-datepicker"
        />

        <label>Fișier atașat</label>
        {filePath ? (
          <>
            <button type="button" onClick={() => setShowPreview(true)} className="preview-button">
              📎 Vezi fișierul
            </button>
            <button type="button" onClick={handleDeleteFile} className="delete-button">
              🗑️ Șterge fișier
            </button>
          </>
        ) : (
          <FileUploadDropzone onFileSelected={(file) => setSelectedFile(file)} />
        )}

        <button type="submit" className="primary-btn">Salvează</button>
      </form>

      <FilePreviewModal
        isOpen={showPreview}
        onRequestClose={() => setShowPreview(false)}
        filePath={filePath}
      />
    </Modal>
  );
};

export default EditIncomeModal;
