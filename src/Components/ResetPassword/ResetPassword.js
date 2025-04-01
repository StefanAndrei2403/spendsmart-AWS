import React, { useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import './ResetPassword.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const token = queryParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setMessage('Te rugăm să introduci o parolă nouă.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/reset-password', {
        token,
        newPassword,
      });

      setMessage(response.data.message);
    } catch (error) {
      setMessage('A apărut o eroare la resetarea parolei. Te rugăm să încerci din nou.');
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h2 className="reset-password-title">Resetare Parolă</h2>
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">Parola nouă</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="reset-password-btn">Resetare parolă</button>
        </form>
        {message && <p className="reset-password-message">{message}</p>}
      </div>
    </div>
  );
};

export default ResetPassword;