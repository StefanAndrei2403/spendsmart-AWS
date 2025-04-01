import React, { useState } from 'react';
import axios from 'axios';
import './Register.css'; 

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !email || !password) {
      setMessage('Te rugăm să completezi toate câmpurile.');
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/register`, {
        username,
        email,
        password,
      });

      setMessage(response.data.message);
    } catch (error) {
      setMessage('A apărut o eroare. Te rugăm să încerci din nou.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Înregistrare</h2>
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Parola</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="register-btn">Înregistrează-te</button>
        </form>
        {message && <p className="register-message">{message}</p>}
      </div>
    </div>
  );
};

export default Register;
