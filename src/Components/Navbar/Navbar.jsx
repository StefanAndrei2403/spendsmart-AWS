import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Importă contextul pentru a accesa autentificarea
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext); // Obține statusul autentificării și funcția de logout

  return (
    <div className="navbar">
      {isAuthenticated && (  // Verifică dacă utilizatorul este autentificat
        <>
          <Link to="/home" className="navbar-link">Acasă</Link>
          <Link to="/add-income" className="navbar-link">Adaugă Venituri</Link>
          <Link to="/add-expense" className="navbar-link">Adaugă Cheltuieli</Link>
          <Link to="/statistics" className="navbar-link">Statistici</Link>
        </>
      )}
      
      {/* Butonul de logout (vizibil doar dacă utilizatorul este autentificat) */}
      {isAuthenticated ? (
        <button className="logout-button" onClick={logout}>Logout</button>
      ) : (
        <Link to="/login" className="navbar-link">Login</Link>
      )}
    </div>
  );
};

export default Navbar;
