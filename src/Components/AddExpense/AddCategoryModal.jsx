import React from 'react';
import './AddCategoryModal.css';

const AddCategoryModal = ({ onClose, onAdd, name, setName, description, setDescription, message }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <h3>Adaugă Categorie Nouă</h3>

                {message && <div className="modal-message">{message}</div>}

                <input
                    type="text"
                    placeholder="Nume categorie"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <textarea
                    placeholder="Descriere"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                />
                <div className="modal-buttons">
                    <button onClick={onAdd}>Adaugă</button>
                    <button className="cancel" onClick={onClose}>Anulează</button>
                </div>
            </div>
        </div>
    );
};


export default AddCategoryModal;
