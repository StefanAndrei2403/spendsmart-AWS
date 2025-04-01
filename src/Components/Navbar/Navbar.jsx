import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Asigură-te că CSS-ul este importat corect

const Navbar = () => {
  // Verifică dacă utilizatorul este autentificat
  const isAuthenticated = localStorage.getItem('token');

  return (
    <div className="navbar">
      {isAuthenticated && (  // Verifică dacă există tokenul în localStorage
        <>
          <Link to="/home">Acasă</Link>
          <Link to="/add-income">Adaugă Venituri</Link>
          <Link to="/add-expense">Adaugă Cheltuieli</Link>
          <Link to="/statistics">Statistici</Link>
        </>
      )}
    </div>
  );
};

export default Navbar;
