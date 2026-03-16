import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Dashboard.css'

const TABS = ['Overview', 'My Listings', 'Offers', 'Inspections', 'Applications', 'My Applications']

export default function Dashboard() {
  const session = getSession()
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [offers, setOffers] = useState([])
  const [inspections, setInspections] = useState([])
  const [applications, setApplications] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)

  const user = session || {}

  // Load core data on mount
  useEffect(() => {
    Promise.all([
      api.users.stats(),
      api.listings.mine(),
    ]).then(([s, l]) => {
      setStats(s)
      setListings(l)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Lazy-load tab data
  const loadTabData = useCallback(async (t) => {
    setTabLoading(true)
    try {
      if (t === 'Offers') {
        const data = await api.offers.received()
        setOffers(data)
      }
      if (t === 'Inspections') {
        const data = await api.inspections.received()
        setInspections(data)
      }
      if (t === 'Applications') {
        const data = await api.applications.received()
        setApplications(data)
      }
      if (t === 'My Applications') {
        const data = await api.applications.mine()
        setMyApplications(data)
      }
    } catch {
      // silently ignore
    } finally {
      setTabLoading(false)
    }
  }, [])

  async function changeStatus(listingId, newStatus) {
    setStatusUpdating(listingId)
    try {
      await api.listings.update(listingId, { status: newStatus })
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l))
    } catch { /* ignore */ } finally {
      setStatusUpdating(null)
    }
  }

  async function deleteListing(listingId) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    try {
      await api.listings.delete(listingId)
      setListings(prev => prev.filter(l => l.id !== listingId))
    } catch { /* ignore */ }
  }

  function handleTabClick(t) {
    setTab(t)
    if (t !== 'Overview' && t !== 'My Listings') {
      loadTabData(t)
    }
  }

  const statusColor = (s) => {
    if (s === 'active') return 'status-active'
    if (s === 'under_offer' || s === 'leased') return 'status-pending'
    if (s === 'sold' || s === 'withdrawn') return 'status-closed'
    return ''
  }

  const statusLabel = (s) => ({
    active: 'Active', under_offer: 'Under Offer', leased: 'Leased',
    sold: 'Sold', withdrawn: 'Withdrawn', pending: 'Pending',
    approved: 'Approved', rejected: 'Rejected',
  })[s] || s

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
              {TABS.map(t => (
                <button
                  key={t}
                  className={`dash-nav-item ${tab === t ? 'active' : ''}`}
                  onClick={() => handleTabClick(t)}
                >
                  {t}
                </button>
              ))}
              <hr className="dash-divider" />
              <Link to="/verify-identity" className="dash-nav-item">Verify Identity</Link>
              <Link to="/offers" className="dash-nav-item">Negotiate Offers</Link>
              {session?.is_admin && <>
                <Link to="/admin" className="dash-nav-item dash-nav-admin">Admin Panel</Link>
                <Link to="/marketing" className="dash-nav-item dash-nav-admin">Marketing</Link>
              </>}
            </nav>
          </aside>

          {/* Main */}
          <div className="dash-main">

            {/* ── Overview ── */}
            {tab === 'Overview' && (
              <section className="dash-section">
                <h2>Overview</h2>
                <div className="dash-stats">
                  {[
                    { val: loading ? '…' : stats?.active_listings ?? 0, label: 'Active listings' },
                    { val: loading ? '…' : stats?.total_views ?? 0, label: 'Total views' },
                    { val: loading ? '…' : stats?.enquiries ?? 0, label: 'Enquiries' },
                    { val: loading ? '…' : stats?.monthly_payments ? `$${Number(stats.monthly_payments).toLocaleString()}` : '$0', label: 'Paid this month' },
                  ].map(s => (
                    <div key={s.label} className="dash-stat">
                      <span className="dash-stat-val">{s.val}</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="dash-quick-links">
                  <Link to="/sell" className="quick-link-card">
                    <span className="quick-link-icon">🏠</span>
                    <span>New listing</span>
                  </Link>
                  <button className="quick-link-card" onClick={() => handleTabClick('My Listings')}>
                    <span className="quick-link-icon">📋</span>
                    <span>My listings</span>
                  </button>
                  <button className="quick-link-card" onClick={() => handleTabClick('Offers')}>
                    <span className="quick-link-icon">🤝</span>
                    <span>Offers received</span>
                  </button>
                  <button className="quick-link-card" onClick={() => handleTabClick('Applications')}>
                    <span className="quick-link-icon">📄</span>
                    <span>Applications</span>
                  </button>
                </div>
              </section>
            )}

            {/* ── My Listings ── */}
            {tab === 'My Listings' && (
              <section className="dash-section">
                <div className="section-head">
                  <h2>My Listings</h2>
                  <Link to="/sell" className="btn-sm-primary">+ New listing</Link>
                </div>

                {loading ? <p>Loading…</p> : listings.length === 0 ? (
                  <p className="dash-empty">No listings yet. <Link to="/sell">Create your first listing</Link></p>
                ) : (
                  <div className="listings-table">
                    {listings.map(l => (
                      <div key={l.id} className="listing-row listing-row-owner">
                        <div className="listing-row-info">
                          <span className={`listing-badge ${l.type}`}>{l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                          <div>
                            <div className="listing-row-title">{l.title}</div>
                            <div className="listing-row-sub">{l.suburb}, {l.state} &nbsp;·&nbsp; ${Number(l.price).toLocaleString()}{l.type === 'rent' ? '/wk' : ''}</div>
                          </div>
                        </div>

                        <div className="listing-row-meta">
                          <span>👁 {l.views ?? 0}</span>
                          <span>💬 {l.enquiries ?? 0}</span>
                          <span className={`row-status ${statusColor(l.status)}`}>{statusLabel(l.status)}</span>
                        </div>

                        <div className="listing-row-actions">
                          <Link to={`/listing/${l.id}/edit`} className="btn-row-action btn-edit">Edit</Link>
                          <Link to={`/listing/${l.id}`} className="btn-row-action btn-view">View</Link>
                          <select
                            className="status-select"
                            value={l.status}
                            disabled={statusUpdating === l.id}
                            onChange={e => changeStatus(l.id, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="under_offer">Under Offer</option>
                            <option value="leased">Leased</option>
                            <option value="sold">Sold</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                          <button className="btn-row-action btn-delete" onClick={() => deleteListing(l.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Offers Received ── */}
            {tab === 'Offers' && (
              <section className="dash-section">
                <div className="section-head">
                  <h2>Offers Received</h2>
                  <Link to="/offers" className="btn-sm-outline">Negotiation centre</Link>
                </div>

                {tabLoading ? <p>Loading…</p> : offers.length === 0 ? (
                  <p className="dash-empty">No offers received yet.</p>
                ) : (
                  <div className="listings-table">
                    {offers.map(o => (
                      <div key={o.id} className="listing-row">
                        <div className="listing-row-info" style={{ flex: 1 }}>
                          <div>
                            <div className="listing-row-title">{o.listing_title || o.listing_id}</div>
                            <div className="listing-row-sub">Offer from {o.buyer_name || 'Buyer'} · ${Number(o.offer_price).toLocaleString()}</div>
                          </div>
                        </div>
                        <span className={`row-status ${statusColor(o.status)}`}>{statusLabel(o.status)}</span>
                        <Link to={`/offers/view/${o.id}`} className="btn-sm-outline">Review</Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Inspections ── */}
            {tab === 'Inspections' && (
              <section className="dash-section">
                <div className="section-head">
                  <h2>Inspection Bookings</h2>
                </div>

                {tabLoading ? <p>Loading…</p> : inspections.length === 0 ? (
                  <p className="dash-empty">No inspection bookings yet.</p>
                ) : (
                  <div className="listings-table">
                    {inspections.map(i => (
                      <div key={i.id} className="listing-row">
                        <div className="listing-row-info" style={{ flex: 1 }}>
                          <div>
                            <div className="listing-row-title">
                              {new Date(i.datetime).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              {' '}
                              {new Date(i.datetime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="listing-row-sub">Booked by {i.booker_name || 'Tenant'}{i.notes ? ` · ${i.notes}` : ''}</div>
                          </div>
                        </div>
                        <span className={`row-status ${i.status === 'confirmed' ? 'status-active' : ''}`}>{statusLabel(i.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Rental Applications ── */}
            {tab === 'Applications' && (
              <section className="dash-section">
                <div className="section-head">
                  <h2>Rental Applications</h2>
                </div>

                {tabLoading ? <p>Loading…</p> : applications.length === 0 ? (
                  <p className="dash-empty">No rental applications received yet.</p>
                ) : (
                  <div className="listings-table">
                    {applications.map(a => (
                      <div key={a.id} className="listing-row">
                        <div className="listing-row-info" style={{ flex: 1 }}>
                          <div>
                            <div className="listing-row-title">{a.tenant_name} <span className="listing-row-sub">({a.tenant_email})</span></div>
                            <div className="listing-row-sub">
                              {a.employment_type} · {a.annual_income ? `$${Number(a.annual_income).toLocaleString()} p.a.` : '—'}
                              {a.move_in_date ? ` · Move-in: ${new Date(a.move_in_date).toLocaleDateString('en-AU')}` : ''}
                            </div>
                          </div>
                        </div>
                        <span className={`row-status ${statusColor(a.status)}`}>{statusLabel(a.status)}</span>
                        <Link to={`/applications/${a.id}`} className="btn-sm-outline">Review</Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── My Applications (as tenant) ── */}
            {tab === 'My Applications' && (
              <section className="dash-section">
                <div className="section-head">
                  <h2>My Rental Applications</h2>
                </div>

                {tabLoading ? <p>Loading…</p> : myApplications.length === 0 ? (
                  <p className="dash-empty">You haven't applied for any rentals yet.</p>
                ) : (
                  <div className="listings-table">
                    {myApplications.map(a => (
                      <div key={a.id} className="listing-row">
                        <div className="listing-row-info" style={{ flex: 1 }}>
                          <div>
                            <div className="listing-row-title">{a.listing_title}</div>
                            <div className="listing-row-sub">
                              {a.listing_suburb} · ${Number(a.listing_price).toLocaleString()}/wk
                              {a.landlord_name ? ` · ${a.landlord_name}` : ''}
                            </div>
                          </div>
                        </div>
                        <span className={`row-status ${statusColor(a.status)}`}>{statusLabel(a.status)}</span>
                        {a.landlord_notes && (
                          <span className="dash-sub" style={{ maxWidth: 200 }}>{a.landlord_notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
