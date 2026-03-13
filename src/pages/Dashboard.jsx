import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Dashboard.css'

export default function Dashboard() {
  const session = getSession()
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.users.stats(),
      api.listings.mine(),
      api.payments.history(),
    ]).then(([s, l, p]) => {
      setStats(s)
      setListings(l)
      setPayments(p)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const user = session || {}

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-grid">

          {/* Sidebar */}
          <aside className="dash-sidebar">
            <div className="dash-profile">
              <div className="dash-avatar">{(user.name || '?')[0]}</div>
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
                  <span className="dash-stat-val">{loading ? '…' : stats?.active_listings ?? 0}</span>
                  <span>Active listings</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">{loading ? '…' : stats?.total_views ?? 0}</span>
                  <span>Total views</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">{loading ? '…' : stats?.enquiries ?? 0}</span>
                  <span>Enquiries</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-stat-val">
                    {loading ? '…' : stats?.monthly_payments ? `$${Number(stats.monthly_payments).toLocaleString()}` : '$0'}
                  </span>
                  <span>Paid this month</span>
                </div>
              </div>
            </section>

            {/* Listings */}
            <section id="listings" className="dash-section">
              <div className="section-head">
                <h2>My Listings</h2>
                <Link to="/sell" className="btn-sm-primary">+ New listing</Link>
              </div>

              {loading ? (
                <p>Loading…</p>
              ) : listings.length === 0 ? (
                <p className="dash-empty">No listings yet. <Link to="/sell">Create your first listing</Link></p>
              ) : (
                <div className="listings-table">
                  {listings.map(l => (
                    <div key={l.id} className="listing-row">
                      <div className="listing-row-info">
                        <span className={`listing-badge ${l.type}`}>{l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                        <div>
                          <div className="listing-row-title">{l.title}</div>
                          <div className="listing-row-sub">{l.suburb}, {l.state}</div>
                        </div>
                      </div>
                      <div className="listing-row-meta">
                        <span>👁 {l.views} views</span>
                        <span>💬 {l.enquiries ?? 0} enquiries</span>
                        <span className={`row-status ${l.status}`}>{l.status}</span>
                      </div>
                      <Link to={`/listing/${l.id}`} className="btn-sm-outline">View</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Payments */}
            <section id="payments" className="dash-section">
              <div className="section-head">
                <h2>Payment History</h2>
                <Link to="/payments" className="btn-sm-primary">Pay rent</Link>
              </div>

              {loading ? (
                <p>Loading…</p>
              ) : payments.length === 0 ? (
                <p className="dash-empty">No payment history yet.</p>
              ) : (
                <div className="payments-table">
                  {payments.slice(0, 5).map(p => (
                    <div key={p.id} className="payment-row">
                      <div>
                        <div className="payment-from">{p.listing_title || 'Payment'}</div>
                        <div className="payment-date">
                          {new Date(p.paid_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="payment-amount">${Number(p.amount).toLocaleString()}</div>
                      <span className={`payment-status ${p.status}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
