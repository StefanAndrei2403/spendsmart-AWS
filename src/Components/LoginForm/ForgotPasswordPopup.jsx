import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPasswordPopup.css';
import ReactDOM from 'react-dom';


const ForgotPasswordPopup = ({ onClose }) => {
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!identifier) {
      setError('Te rugăm să introduci un email sau username.');
      return;
    }

    const endpoint = method === 'email' ? '/recover-password-email' : '/recover-password-username';
    const payload = method === 'email' ? { email: identifier } : { username: identifier };

    try {
      const response = await axios.post(endpoint, payload);
      setMessage(response.data.message || 'Email trimis cu succes!');
    } catch (err) {
      setError(err.response?.data?.message || 'A apărut o eroare.');
    }
  };

  return ReactDOM.createPortal(
    <div className="forgot-password-overlay">
      <div className="forgot-password-popup">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Resetare Parolă</h2>
        <form onSubmit={handleSubmit}>
          <div className="radio-options">
            <label>
              <input type="radio" value="email" checked={method === 'email'} onChange={() => setMethod('email')} />
              Email
            </label>
            <label>
              <input type="radio" value="username" checked={method === 'username'} onChange={() => setMethod('username')} />
              Username
            </label>
          </div>
  
          <input
            type="text"
            placeholder={method === 'email' ? 'Introduceți email-ul' : 'Introduceți username-ul'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
  
          <button type="submit">Trimite link de resetare</button>
  
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>,
    document.body
  );
}  

export default ForgotPasswordPopup;
