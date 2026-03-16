import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import { getSession, logout } from '../../auth'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const session = getSession()

  const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link'

  function handleLogout() {
    logout()
    navigate('/')
  }

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
        </nav>

        <div className="navbar-actions">
          {session ? (
            <>
              <span className="nav-user">Hi, {session.name.split(' ')[0]}</span>
              <button className="btn-outline" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="btn-primary" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={() => navigate('/login')}>Log in</button>
              <button className="btn-primary" onClick={() => navigate('/register')}>Sign up</button>
            </>
          )}
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
