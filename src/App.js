import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'; // Adăugat useLocation
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginForm from './Components/LoginForm/LoginForm.jsx';
import Home from './Components/Home/Home.jsx';
import ResetPassword from './Components/ResetPassword/ResetPassword.js';
import Register from './Components/Register/Register.js';
import AddIncome from './Components/AddIncome/AddIncome.jsx';
import AddExpense from './Components/AddExpense/AddExpense.jsx';
import Statistics from './Components/Statistics/Statistics.jsx';
import Navbar from './Components/Navbar/Navbar.jsx';


function App() {
  return (
    <GoogleOAuthProvider clientId="166245198945-gh14hvgqlcrr58re9rjdqu985srlnnvo.apps.googleusercontent.com">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

const AppRoutes = () => {
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Initial state null for better control

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Or any loading indicator you prefer
  }

  return (
    <>
      {isAuthenticated && window.location.pathname !== "/" && !['/register', '/reset-password'].includes(location.pathname) && <Navbar />}
      
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/home" element={<Home />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/add-income" element={<AddIncome />} />
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </>
  );
}

export default App;
