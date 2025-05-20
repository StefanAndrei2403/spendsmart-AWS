
import React, { useState } from 'react';
import Modal from 'react-modal';
import { FiX } from 'react-icons/fi';
import './EditIncomeModal.css';

Modal.setAppElement('#root');

const EditBudgetModal = ({ isOpen, onRequestClose, budget, onSave }) => {
  const [amount, setAmount] = useState(budget || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(amount);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Editează Buget"
      className="modal-content"
      overlayClassName="modal-overlay"
    >
      <div className="modal-header">
        <h2>Editează Bugetul</h2>
        <button className="modal-close" onClick={onRequestClose}>
          <FiX />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="modal-form">
        <input
          type="number"
          placeholder="Sumă buget"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit" className="primary-btn">Salvează Buget</button>
      </form>
    </Modal>
  );
};

export default EditBudgetModal;
