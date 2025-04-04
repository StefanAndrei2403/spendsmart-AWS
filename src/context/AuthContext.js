import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext); // Hook personalizat pentru a accesa contextul
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    console.log("Token din localStorage:", token);
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      axios.post(
        `${process.env.REACT_APP_API_URL}/verify-token`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(response => {
        if (response.data.isValid) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          console.warn("Token invalid - șters");
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
          navigate('/');
        }
      })
      .catch(error => {
        console.error('Eroare la verificarea token-ului:', error);
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        navigate('/');
      });
    } else {
      setIsAuthenticated(false);
      navigate('/');
    }
  }, [navigate]);

  const login = (userDetails) => {
    if (!userDetails.token) {
      console.error("❌ Token-ul lipsă! Backend-ul nu l-a trimis.");
      return;
    }

    localStorage.setItem('auth_token', userDetails.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userDetails.token}`;

    setIsAuthenticated(true);
    setUser(userDetails);
    navigate('/home');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
