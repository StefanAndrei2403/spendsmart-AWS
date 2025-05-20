import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';
import { useNavigate } from 'react-router-dom';



const Register = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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
      setIsSuccess(response.data.message === 'Utilizator înregistrat cu succes');

      if (response.data.message === 'Utilizator înregistrat cu succes') {
        setIsSuccess(true);
        setMessage('Utilizator înregistrat cu succes! Redirecționare...');

        setTimeout(() => {
          navigate('/');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }, 2000);
      }


    } catch (error) {
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
        setIsSuccess(false);
      } else {
        setMessage('A apărut o eroare. Te rugăm să încerci din nou.');
      }
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
        {message && (
          <p className={`register-message ${isSuccess ? 'success' : 'error'}`}>
            {message}
          </p>
        )}

      </div>
    </div>
  );
};

export default Register;
