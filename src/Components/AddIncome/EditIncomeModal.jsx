
import React, { useState } from 'react';
import Modal from 'react-modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiX } from 'react-icons/fi';
import './EditIncomeModal.css'; // Import your CSS file for styling

Modal.setAppElement('#root');

const EditIncomeModal = ({ isOpen, onRequestClose, income, onSave }) => {
  const [name, setName] = useState(income?.name || '');
  const [amount, setAmount] = useState(income?.amount || '');
  const [date, setDate] = useState(income?.date ? new Date(income.date) : new Date());

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...income, name, amount, date });
    onRequestClose();
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
        <button type="submit" className="primary-btn">Salvează</button>
      </form>
    </Modal>
  );
};

export default EditIncomeModal;
