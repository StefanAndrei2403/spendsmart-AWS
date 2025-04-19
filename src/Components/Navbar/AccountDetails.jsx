import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AccountDetails.css';

const AccountDetails = () => {
  const [userData, setUserData] = useState({ username: '', email: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/profile');
        setUserData(response.data.user);
      } catch (error) {
        console.error('Eroare la preluarea datelor:', error);
        setErrorMessage('Nu s-au putut încărca datele utilizatorului.');
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/update-user', userData);
      setSuccessMessage('Datele au fost actualizate cu succes!');
      setErrorMessage('');
    } catch (err) {
      console.error(err);
      setErrorMessage('Eroare la actualizarea datelor.');
      setSuccessMessage('');
    }
  };

  return (
    <div className="account-container">
      <div className="account-card">
        <h2 className="account-title">Datele contului</h2>

        {successMessage && <p className="account-success">{successMessage}</p>}
        {errorMessage && <p className="account-error">{errorMessage}</p>}

        <form onSubmit={handleSave} className="account-form">
          <div className="form-group">
            <label>Nume utilizator:</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="save-btn">💾 Salvează modificările</button>
        </form>
      </div>
    </div>
  );
};

export default AccountDetails;
