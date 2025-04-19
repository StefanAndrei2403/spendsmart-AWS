import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { CiUser } from "react-icons/ci";
import { RiLockPasswordLine } from "react-icons/ri";
import { AuthContext } from '../../context/AuthContext';
import Register from '../Register/Register';
import './LoginForm.css';
import ForgotPasswordPopup from './ForgotPasswordPopup';


const LoginForm = () => {
  const { login } = useContext(AuthContext); // Folosim direct funcția login din context
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate();

  // Verificăm dacă există un token în localStorage și validăm dacă este valid
  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    const isResetRoute = window.location.pathname === '/reset-password';

    if (token) {
      axios.get('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(response => {
          console.log('Acces permis:', response.data);
        })
        .catch(error => {
          console.error('Token invalid sau expirat', error);
          if (!isResetRoute) {
            navigate('/login');
          }
        });
    } else {
      if (!isResetRoute) {
        navigate('/login');
      }
    }
  }, [navigate]);


  const handleGoogleLoginSuccess = async (response) => {
    try {
      console.log('Google login response:', response);

      const requestData = { token: response.credential };
      console.log('Sending token to backend:', requestData);

      // Trimite cererea către backend
      const res = await axios.post('/google-login', requestData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,  // Asigură-te că trimite cookie-urile cu cererea
      });

      console.log('Response from backend:', res.data);

      // Verifică dacă răspunsul conține un token
      if (res.data.token) {
        // Setează token-ul în context
        login({
          token: res.data.token,
          user: res.data.user
        });

        // Salvează token-ul în localStorage pentru a fi disponibil pe termen lung
        localStorage.setItem('auth_token', res.data.token);

        // Redirecționează utilizatorul pe pagina de home
        navigate('/home');
      } else {
        setErrorMessage('Nu am primit un token valid');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setErrorMessage('Google authentication failed. Please try again.');
    }
  };


  const handleGoogleLoginFailure = () => {
    setErrorMessage('Google login was cancelled or failed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Resetare mesaj de eroare

    try {
      // Verifică dacă este înregistrare sau login
      const endpoint = showRegister ? '/register' : '/login';
      const payload = showRegister ? { username, email, password } : { username, password };

      // Trimite cererea POST către server
      const response = await axios.post(endpoint, payload, { withCredentials: true });

      // Verifică dacă serverul a răspuns cu un token valid
      if (response.status === 200) {
        const { token } = response.data;

        // Verifică dacă token-ul există și este valid
        if (token) {
          // Salvează token-ul în context (AuthContext)
          login({ token });

          // Salvează token-ul și în localStorage pentru a fi disponibil pe termen lung
          localStorage.setItem('auth_token', token);

          // Redirecționează utilizatorul pe pagina de home
          navigate('/home');
        } else {
          setErrorMessage('Failed to authenticate. Please try again.');
        }
      } else {
        setErrorMessage('Authentication failed');
      }
    } catch (error) {
      // Gestionarea erorilor de server
      setErrorMessage(error.response?.data?.message || 'Server communication error');
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="login-container-center">
    <div className='wrapper'>
      {!showRegister ? (
        <form onSubmit={handleSubmit}>
          <h1>Login</h1>
          <div className='input-box'>
            <CiUser className='icon' />
            <input type='text' placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className='input-box'>
            <RiLockPasswordLine className='icon' />
            <input type='password' placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="remember-forgot">
            <label><input type="checkbox" />Remember me</label>
            <button
              type="button"
              className="link-button"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>


          {showForgotPassword && (
            <ForgotPasswordPopup onClose={() => setShowForgotPassword(false)} />
          )}
          <button type="submit">Login</button>
          {errorMessage && <p>{errorMessage}</p>}
          <div className="register-link">
            <p>Don't have an account?
              <button type="button" className="link-button" onClick={() => setShowRegister(true)}>Register</button>
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
            clientId="166245198945-gh14hvgqlcrr58re9rjdqu985srlnnvo.apps.googleusercontent.com"
            uxMode="popup"
          />

        </div>
        
      )}
    </div>
    </div>

  );
};

export default LoginForm;
