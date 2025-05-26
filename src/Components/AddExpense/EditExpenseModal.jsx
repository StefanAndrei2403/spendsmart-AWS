import React, { useState, useEffect } from 'react';
import './EditExpenseModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaTimes } from 'react-icons/fa';

const EditExpenseModal = ({ expense, categories, onClose, onSave }) => {
  const [editedExpense, setEditedExpense] = useState({ ...expense });

  useEffect(() => {
    setEditedExpense({ ...expense });
  }, [expense]);

  const handleChange = (field, value) => {
    setEditedExpense((prev) => ({ ...prev, [field]: value }));
  };

const handleSubmit = (e) => {
  e.preventDefault();

  // Validare simplă: toate câmpurile trebuie completate
  if (
    !editedExpense.name ||
    !editedExpense.amount ||
    !editedExpense.date ||
    !editedExpense.category_id
  ) {
    alert("Completează toate câmpurile înainte de a salva.");
    return;
  }

  onSave(editedExpense);
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
          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={onClose}>Anulează</button>
            <button type="submit" className="primary-btn">Salvează modificările</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;