import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Navbar.css';
import { FaUserCircle } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';


const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Închide dropdown-ul dacă se apasă în afara lui
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleAccountData = () => {
    navigate('/account'); // asigură-te că ai o rută pentru Datele contului
    setDropdownOpen(false);
  };

  const handlePasswordReset = () => {
    navigate('/reset-password'); // sau către o pagină specială de reset
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <div className="navbar">
      {isAuthenticated && (
        <div className="navbar-links">
          <NavLink to="/home" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Acasă</NavLink>
          <NavLink to="/add-income" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Administrează Venituri</NavLink>
          <NavLink to="/add-expense" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Administrează Cheltuieli</NavLink>
          <NavLink to="/statistics" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Statistici</NavLink>
        </div>
      )
      }

      {
        isAuthenticated ? (
          <div className="profile-dropdown" ref={dropdownRef}>
            <button className="profile-button" onClick={handleProfileClick}>
              <FaUserCircle size={20} />
              Profilul meu
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={handleAccountData}>Datele contului</button>
                <button onClick={handlePasswordReset}>Resetează parola</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="navbar-link">Login</Link>
        )
      }
    </div >
  );
};

export default Navbar;
