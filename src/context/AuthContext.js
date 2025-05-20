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
    const currentPath = window.location.pathname;

    const isResetRoute = currentPath === '/reset-password' || currentPath.startsWith('/reset-password?');

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
            localStorage.removeItem('auth_token');
            setIsAuthenticated(false);
            if (!isResetRoute) navigate('/');
          }
        })
        .catch(error => {
          console.error('Eroare la verificarea token-ului:', error);
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
          if (!isResetRoute) navigate('/');
        });
    } else {
      setIsAuthenticated(false);
      if (!isResetRoute) navigate('/');
    }
  }, [navigate]);


  const login = async (userDetails) => {
    const token = userDetails.token;

    if (!token) {
      console.error("❌ Token-ul lipsă! Backend-ul nu l-a trimis.");
      return;
    }

    // Salvează token-ul și setează antetul global
    localStorage.setItem('auth_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);

    if (userDetails.user) {
      // ✅ Dacă user-ul e primit din backend
      setUser(userDetails.user);
      navigate('/home');
    } else {
      // 🔁 Dacă nu avem user, îl cerem prin /profile
      try {
        const res = await axios.get('/profile');
        if (res.data && res.data.user) {
          setUser(res.data.user);
          navigate('/home');
        } else {
          console.error("⚠️ Token primit, dar userul nu a fost găsit.");
        }
      } catch (err) {
        console.error("❌ Eroare la obținerea profilului:", err);
      }
    }
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
