
import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Navbar.css';
import { FaUserCircle, FaSignOutAlt, FaHome, FaPlus, FaChartPie, FaUserCog, FaLock } from 'react-icons/fa';

const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="navbar">
        <div className="navbar-links">
          <NavLink to="/" className="navbar-link">
            <FaHome /> Acasă
          </NavLink>
          <NavLink to="/add-income" className="navbar-link">
            <FaPlus /> Venituri
          </NavLink>
          <NavLink to="/add-expense" className="navbar-link">
            <FaPlus /> Cheltuieli
          </NavLink>
          
          <NavLink to="/statistics" className="navbar-link">
            <FaChartPie /> Statistici
          </NavLink>
        </div>
        {isAuthenticated && (
          <div className="navbar-links">
            <button className="navbar-link" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <FaUserCircle /> Profilul meu
            </button>
            {dropdownOpen && (
              <div className="profile-dropdown fade-in" ref={dropdownRef}>
                <Link to="/account" onClick={() => setDropdownOpen(false)}>
                  <FaUserCog /> Datele contului
                </Link>
                <Link to="/change-password" onClick={() => setDropdownOpen(false)}>
                  <FaLock /> Resetează parola
                </Link>
                <button onClick={handleLogout}>
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="navbar-space"></div>
    </>
  );
};

export default Navbar;
