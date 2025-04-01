import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { CiUser } from "react-icons/ci";
import { RiLockPasswordLine } from "react-icons/ri";
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import Register from '../Register/Register';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoverByUsername, setRecoverByUsername] = useState(true); // Pentru a selecta opțiunea de recuperare
  const navigate = useNavigate();

  // Handler pentru Google login
  const handleGoogleLoginSuccess = async (response) => {
    const token = response.credential;
    try {
      // Trimite tokenul către server
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/google-login`, { token });

      // Salvează tokenul în localStorage pentru a păstra sesiunea
      localStorage.setItem('token', res.data.token);
      navigate('/home');
    } catch (error) {
      console.log('Eroare la autentificare cu Google.', error);
    }
  };

  const handleGoogleLoginFailure = (error) => {
    setErrorMessage('Eroare la autentificare cu Google.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = showRegister 
    ? `${process.env.REACT_APP_API_URL}/register` 
    : `${process.env.REACT_APP_API_URL}/login`;

    const data = showRegister ? { username, email, password } : { username, password };

    try {
      const response = await axios.post(endpoint, data);
      if (!showRegister) {
        localStorage.setItem('token', response.data.token);
        navigate('/home');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'A apărut o eroare.');
    }
  };

  // Funcție pentru a trimite cererea de recuperare parolă
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const endpoint = recoverByUsername 
    ? `${process.env.REACT_APP_API_URL}/recover-password-username` 
    : `${process.env.REACT_APP_API_URL}/recover-password-email`;
    const data = recoverByUsername ? { username } : { email };

    try {
      await axios.post(endpoint, data);
      setShowForgotPassword(false);
      alert('Email-ul a fost trimis dacă există un cont asociat!');
    } catch (error) {
      setErrorMessage('Eroare la trimiterea emailului.');
    }
  };

  const handleRegisterClick = () => {
    navigate('/register');  // Navighează direct la pagina de Register
  };

  return (
    <div className='wrapper'>
      {!showRegister ? (
        <form onSubmit={handleSubmit}>
          <h1>Login</h1>
          <div className='input-box'>
            <CiUser className='icon' />
            <input
              type='text'
              placeholder='Username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className='input-box'>
            <RiLockPasswordLine className='icon' />
            <input
              type='password'
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="remember-forgot">
            <label><input type="checkbox" />Remember me</label>
            <button type="button" className="link-button" onClick={() => setShowForgotPassword(true)}>
              Forgot password?
            </button>
          </div>

          <button type="submit">Login</button>
          {errorMessage && <p>{errorMessage}</p>}

          <div className="register-link">
            <p>Don't have an account?
              <button type="button" className="link-button" onClick={handleRegisterClick}>
                Register
              </button>
            </p>
          </div>
        </form>
      ) : (
        <Register />
      )}

      {!showRegister && (
        <div className="google-login">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginFailure}
          />
        </div>
      )}

      {/* Fereastra Modală pentru Forgot Password */}
      {showForgotPassword && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <h2>Forgot Password</h2>
            <form onSubmit={handleForgotPasswordSubmit}>
              <label>
                <input
                  type="radio"
                  name="recoverMethod"
                  checked={recoverByUsername}
                  onChange={() => setRecoverByUsername(true)}
                />
                Recuperare după username
              </label>
              <label>
                <input
                  type="radio"
                  name="recoverMethod"
                  checked={!recoverByUsername}
                  onChange={() => setRecoverByUsername(false)}
                />
                Recuperare după email
              </label>
              <div>
                {recoverByUsername ? (
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                ) : (
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                )}
              </div>
              <button type="submit">Send Email</button>
              <button type="button" onClick={() => setShowForgotPassword(false)}>Close</button>
            </form>
            {errorMessage && <p>{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
