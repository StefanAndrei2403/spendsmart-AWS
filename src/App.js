import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext'; 
import AppContent from './AppContent'; // Creăm un component separat pentru logica autentificării
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



axios.defaults.withCredentials = true;
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL ||
  'spendsmart.eu-central-1.elasticbeanstalk.com';
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

console.log('🧪 API URL din .env:', process.env.REACT_APP_API_URL);

// Interceptor pentru response
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Șterge token-ul și redirectează la login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <GoogleOAuthProvider clientId="166245198945-gh14hvgqlcrr58re9rjdqu985srlnnvo.apps.googleusercontent.com">
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar /> 
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
  
}

export default App;
