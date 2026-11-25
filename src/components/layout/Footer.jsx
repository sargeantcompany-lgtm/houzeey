import { Link } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={logo} alt="Houzeey" className="footer-logo-img" />
          <p>Australia's private property marketplace. Find homes listed by their owners, reviewed before they go live.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Buy & Sell</h4>
            <Link to="/buy">Properties for Sale</Link>
            <Link to="/sell">List Your Property</Link>
            <Link to="/sell">How It Works</Link>
            <Link to="/guides">Selling Guides</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Log In</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/saved">Saved Properties</Link>
            <Link to="/notifications">Notifications</Link>
            <Link to="/profile">My Profile</Link>
          </div>
          <div className="footer-col">
            <h4>Help &amp; Legal</h4>
            <Link to="/support">Support &amp; Help</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/verify-identity">Verify Identity</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Houzeey. All rights reserved.</p>
      </div>
    </footer>
  )
}
