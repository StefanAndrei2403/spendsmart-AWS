import React, { useState, useEffect } from 'react';
import './EditExpenseModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';
import FileUploadExpense from './FileUploadExpense';
import FilePreviewExpenseModal from './FilePreviewExpenseModal';

const EditExpenseModal = ({ expense, categories, onClose, onSave }) => {
  const [editedExpense, setEditedExpense] = useState({ ...expense });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setEditedExpense({ ...expense });
    setSelectedFile(null); // reset la fiecare redeschidere
  }, [expense]);

  const handleChange = (field, value) => {
    setEditedExpense((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteFile = async () => {
    try {
      console.log("📤 Expense ID pentru delete:", expense.id);
      await axios.delete(`/api/expenses/${expense.id}/remove-file`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      setEditedExpense((prev) => ({ ...prev, file_path: null }));
      setSelectedFile(null);
      alert("Fișierul a fost șters cu succes.");
    } catch (error) {
      console.error("❌ Eroare la ștergerea fișierului:", error);
      alert("Eroare la ștergerea fișierului.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !editedExpense.name ||
      !editedExpense.amount ||
      !editedExpense.date ||
      !editedExpense.category_id
    ) {
      alert("Completează toate câmpurile înainte de a salva.");
      return;
    }

    try {
      await onSave(editedExpense); // salvează cheltuiala

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        await axios.post(`/api/expenses/upload/${expense.id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      onClose();
    } catch (err) {
      console.error("❌ Eroare la actualizare cheltuială sau upload:", err);
      alert("Eroare la salvarea modificărilor.");
    }
  };

  return (
    <div className="edit-expense-modal">
      <div className="modal-content">
        <FaTimes className="close-icon" onClick={onClose} />
        <h2>Editează Cheltuiala</h2>
        <form onSubmit={handleSubmit}>
          <label>Nume cheltuială</label>
          <input
            type="text"
            value={editedExpense.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />

          <label>Sumă</label>
          <input
            type="number"
            value={editedExpense.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
          />

          <label>Data</label>
          <DatePicker
            selected={new Date(editedExpense.date)}
            onChange={(date) => handleChange('date', date.toISOString().split('T')[0])}
            dateFormat="yyyy-MM-dd"
            className="datepicker"
          />

          <label>Categorie</label>
          <select
            value={editedExpense.category_id}
            onChange={(e) => handleChange('category_id', e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="impulsiv"
              checked={editedExpense.planned_impulsive}
              onChange={(e) => handleChange('planned_impulsive', e.target.checked)}
            />
            <label htmlFor="impulsiv">Cheltuială neplanificată / impulsivă</label>
          </div>

          <label>Fișier atașat</label>
          {editedExpense.file_path ? (
            <>
              <button type="button" onClick={() => setShowPreview(true)} className="preview-button">
                📎 Vezi fișierul
              </button>
              <button type="button" onClick={handleDeleteFile} className="delete-button">
                🗑️ Șterge fișier
              </button>
            </>
          ) : (
            <FileUploadExpense onFileSelected={(file) => setSelectedFile(file)} />
          )}

          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={onClose}>Anulează</button>
            <button type="submit" className="primary-btn">Salvează modificările</button>
          </div>
        </form>

        <FilePreviewExpenseModal
          isOpen={showPreview}
          onRequestClose={() => setShowPreview(false)}
          filePath={`${process.env.REACT_APP_API_URL}/${editedExpense.file_path?.replace(/\\/g, '/')}`}
        />
      </div>
    </div>
  );
};

export default EditExpenseModal;
