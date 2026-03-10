import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link'

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="Houzeey" className="navbar-logo-img" />
        </Link>

        <nav className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/buy" className={navLinkClass} onClick={() => setMenuOpen(false)}>Buy</NavLink>
          <NavLink to="/rent" className={navLinkClass} onClick={() => setMenuOpen(false)}>Rent</NavLink>
          <NavLink to="/sell" className={navLinkClass} onClick={() => setMenuOpen(false)}>Sell</NavLink>
          <NavLink to="/marketplace" className={navLinkClass} onClick={() => setMenuOpen(false)}>Marketplace</NavLink>
          <NavLink to="/messages" className={navLinkClass} onClick={() => setMenuOpen(false)}>Messages</NavLink>
        </nav>

        <div className="navbar-actions">
          <button className="btn-outline" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn-primary" onClick={() => navigate('/register')}>Sign up</button>
        </div>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
