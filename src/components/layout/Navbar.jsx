import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import { getSession, logout } from '../../auth'
import { api } from '../../api'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()
  const session = getSession()

  const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link'

  useEffect(() => {
    if (!session) return
    api.notifications.list()
      .then(d => setUnread(d.unread_count || 0))
      .catch(() => {})
    // Poll every 60s
    const iv = setInterval(() => {
      api.notifications.list().then(d => setUnread(d.unread_count || 0)).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [session?.id])

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
          {session && <>
            <NavLink to="/saved" className={navLinkClass} onClick={() => setMenuOpen(false)}>Saved</NavLink>
          </>}
        </nav>

        <div className="navbar-actions">
          {session ? (
            <>
              {/* Notification bell */}
              <Link to="/notifications" className="nav-bell" title="Notifications">
                🔔
                {unread > 0 && <span className="nav-bell-badge">{unread > 9 ? '9+' : unread}</span>}
              </Link>

              {/* Profile dropdown */}
              <div className="nav-user-menu">
                <button className="nav-user-btn" onClick={() => navigate('/profile')}>
                  <span className="nav-avatar">{(session.name || '?')[0].toUpperCase()}</span>
                  <span className="nav-user-name">{session.name.split(' ')[0]}</span>
                </button>
              </div>

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
