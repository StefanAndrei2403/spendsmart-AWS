import React, { useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext'; 
import LoginForm from './Components/LoginForm/LoginForm';
import Home from './Components/Home/Home';
import ResetPassword from './Components/ResetPassword/ResetPassword';
import Register from './Components/Register/Register';
import AddIncome from './Components/AddIncome/AddIncome';
import AddExpense from './Components/AddExpense/AddExpense';
import Statistics from './Components/Statistics/Statistics';
import Navbar from './Components/Navbar/Navbar'; // Folosește Navbar în loc de Header

const AppContent = () => {
  const { isAuthenticated } = useContext(AuthContext); // Verifică dacă utilizatorul este autentificat
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {isAuthenticated && <Navbar />} {/* Folosește Navbar aici */}
      <AppRoutes isAuthenticated={isAuthenticated} />
    </>
  );
};

const AppRoutes = ({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/add-income" element={<AddIncome />} />
      <Route path="/add-expense" element={<AddExpense />} />
      <Route path="/statistics" element={<Statistics />} />
    </Routes>
  );
};

export default AppContent;
