import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/index.css';

const Navigation = () => {
  return (
    <nav style={navStyle}>
      <div style={navContainerStyle}>
        <div style={logoStyle}>GAML Studio</div>
        <div style={linksStyle}>
          <NavLink
            to="/"
            style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
          >
            Modeling
          </NavLink>
          <NavLink
            to="/simulation"
            style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
          >
            Simulation
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

const navStyle = {
  backgroundColor: '#2c3e50',
  padding: '0 20px',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const navContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  maxWidth: '1400px',
  margin: '0 auto'
};

const logoStyle = {
  color: 'white',
  fontSize: '1.4em',
  fontWeight: 'bold'
};

const linksStyle = {
  display: 'flex',
  gap: '10px'
};

const linkStyle = {
  color: '#bdc3c7',
  textDecoration: 'none',
  padding: '10px 20px',
  borderRadius: '4px',
  transition: 'all 0.2s ease'
};

const activeLinkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '10px 20px',
  borderRadius: '4px',
  backgroundColor: '#34495e',
  transition: 'all 0.2s ease'
};

export default Navigation;
