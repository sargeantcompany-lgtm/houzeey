import { Link } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={logo} alt="Houzeey" className="footer-logo-img" />
          <p>Australia's peer-to-peer real estate platform. Buy, sell and rent property — no agents, no commissions.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Buy & Sell</h4>
            <Link to="/buy">Properties for Sale</Link>
            <Link to="/sell">List Your Property</Link>
            <Link to="/sell">How It Works</Link>
          </div>
          <div className="footer-col">
            <h4>Rent</h4>
            <Link to="/rent">Rental Listings</Link>
            <Link to="/rent">List a Rental</Link>
            <Link to="/rent">Tenant Resources</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Log In</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/messages">Messages</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Houzeey Pty Ltd. All rights reserved. ABN 00 000 000 000</p>
      </div>
    </footer>
  )
}
