import { Link } from 'react-router-dom'
import './Dashboard.css'

const MOCK_USER = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'Seller / Landlord',
  verified: true,
  listings: [
    { id: 1, title: '4 Bed Family Home', suburb: 'Surry Hills NSW', type: 'sale', status: 'active', views: 142, enquiries: 8, price: 1450000 },
    { id: 3, title: 'City Apartment', suburb: 'CBD VIC', type: 'rent', status: 'active', views: 89, enquiries: 5, price: 2800 },
  ],
  payments: [
    { id: 1, from: 'Tom Brady', amount: 2800, date: '01 Mar 2026', status: 'paid' },
    { id: 2, from: 'Tom Brady', amount: 2800, date: '01 Feb 2026', status: 'paid' },
  ],
}

export default function Dashboard() {
  const user = MOCK_USER

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-grid">

          {/* Sidebar */}
          <aside className="dash-sidebar">
            <div className="dash-profile">
              <div className="dash-avatar">{user.name[0]}</div>
              <div>
                <div className="dash-name">
                  {user.name}
                  {user.verified && <span className="verified-badge">✓ Verified</span>}
                </div>
                <div className="dash-role">{user.role}</div>
              </div>
            </div>

            <nav className="dash-nav">
              <a href="#overview" className="dash-nav-item active">Overview</a>
              <a href="#listings" className="dash-nav-item">My Listings</a>
              <a href="#payments" className="dash-nav-item">Payments</a>
              <Link to="/messages" className="dash-nav-item">Messages</Link>
              <a href="#documents" className="dash-nav-item">Documents</a>
              <a href="#profile" className="dash-nav-item">Profile settings</a>
            </nav>
          </aside>

          {/* Main */}
          <div className="dash-main">

            {/* Stats */}
            <section id="overview">
              <h2>Overview</h2>
              <div className="dash-stats">
                <div className="dash-stat">
                  <span className="dash-stat-val">2</span>
                  <span>Active listings</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">231</span>
                  <span>Total views</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">13</span>
                  <span>Enquiries</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">$2,800</span>
                  <span>Next payment</span>
                </div>
              </div>
            </section>

            {/* Listings */}
            <section id="listings" className="dash-section">
              <div className="section-head">
                <h2>My Listings</h2>
                <Link to="/sell" className="btn-sm-primary">+ New listing</Link>
              </div>

              <div className="listings-table">
                {user.listings.map(l => (
                  <div key={l.id} className="listing-row">
                    <div className="listing-row-info">
                      <span className={`listing-badge ${l.type}`}>{l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                      <div>
                        <div className="listing-row-title">{l.title}</div>
                        <div className="listing-row-sub">{l.suburb}</div>
                      </div>
                    </div>
                    <div className="listing-row-meta">
                      <span>👁 {l.views} views</span>
                      <span>💬 {l.enquiries} enquiries</span>
                      <span className={`row-status ${l.status}`}>{l.status}</span>
                    </div>
                    <Link to={`/listing/${l.id}`} className="btn-sm-outline">View</Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Payments */}
            <section id="payments" className="dash-section">
              <div className="section-head">
                <h2>Payments</h2>
                <span className="dash-sub">Next due: 01 Apr 2026</span>
              </div>

              <div className="payments-table">
                {user.payments.map(p => (
                  <div key={p.id} className="payment-row">
                    <div>
                      <div className="payment-from">{p.from}</div>
                      <div className="payment-date">{p.date}</div>
                    </div>
                    <div className="payment-amount">${p.amount.toLocaleString()}</div>
                    <span className={`payment-status ${p.status}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
