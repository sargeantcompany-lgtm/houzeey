import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Admin.css'

const TABS = ['Overview', 'Users', 'Listings', 'Verifications']

export default function Admin() {
  const session = getSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!session?.is_admin) { navigate('/'); return }
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [s, u, l, v] = await Promise.all([
        api.admin.stats(),
        api.admin.users(),
        api.admin.listings(),
        api.admin.verifications(),
      ])
      setStats(s)
      setUsers(u.users)
      setListings(l)
      setVerifications(v)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateUser(id, data) {
    try {
      const updated = await api.admin.updateUser(id, data)
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      setSuccess('User updated')
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api.admin.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      setSuccess('User deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateListing(id, status) {
    try {
      await api.admin.updateListing(id, { status })
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
      setSuccess('Listing updated')
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteListing(id) {
    if (!confirm('Delete this listing?')) return
    try {
      await api.admin.deleteListing(id)
      setListings(prev => prev.filter(l => l.id !== id))
      setSuccess('Listing deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  async function reviewVerification(id, status) {
    const notes = status === 'rejected' ? prompt('Reason for rejection (optional):') : null
    try {
      await api.admin.reviewVerification(id, status, notes)
      setVerifications(prev => prev.filter(v => v.id !== id))
      setSuccess(`Verification ${status}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!session?.is_admin) return null
  if (loading) return <div className="container"><p className="loading-text">Loading admin panel…</p></div>

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <span className="admin-badge">Admin</span>
        </div>

        {error && <div className="error-msg" onClick={() => setError('')}>{error} ✕</div>}
        {success && <div className="success-msg" onClick={() => setSuccess('')}>{success} ✕</div>}

        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'Overview' && stats && (
          <div className="admin-stats">
            {[
              { label: 'Total Users', val: stats.total_users, icon: '👥' },
              { label: 'Active Listings', val: stats.active_listings, icon: '🏠' },
              { label: 'Total Offers', val: stats.total_offers, icon: '📋' },
              { label: 'Rental Applications', val: stats.total_applications, icon: '📝' },
              { label: 'Reviews', val: stats.total_reviews, icon: '⭐' },
              { label: 'Marketing Contacts', val: stats.total_contacts, icon: '📧' },
              { label: 'Pending Verifications', val: stats.pending_verifications, icon: '🪪', alert: stats.pending_verifications > 0 },
              { label: 'Pending Offers', val: stats.pending_offers, icon: '⏳' },
            ].map(s => (
              <div key={s.label} className={`admin-stat ${s.alert ? 'admin-stat--alert' : ''}`}>
                <span className="admin-stat-icon">{s.icon}</span>
                <span className="admin-stat-val">{s.val}</span>
                <span className="admin-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {tab === 'Users' && (
          <div className="admin-section">
            <div className="admin-toolbar">
              <input
                className="admin-search"
                placeholder="Search users by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="admin-count">{filteredUsers.length} users</span>
            </div>
            <div className="admin-table">
              <div className="admin-table-head">
                <span>User</span><span>Role</span><span>Verified</span><span>Trust</span><span>Actions</span>
              </div>
              {filteredUsers.map(u => (
                <div key={u.id} className="admin-table-row">
                  <div className="user-cell">
                    <div className="user-name">{u.name}</div>
                    <div className="user-email">{u.email}</div>
                  </div>
                  <span className="admin-role">{u.role}</span>
                  <span className={`admin-verified ${u.verified ? 'yes' : 'no'}`}>{u.verified ? '✓' : '✗'}</span>
                  <span className="admin-trust">{u.trust_score}/5</span>
                  <div className="admin-actions">
                    {!u.verified && (
                      <button className="act-btn act-green" onClick={() => updateUser(u.id, { verified: true })}>Verify</button>
                    )}
                    {!u.is_admin && (
                      <button className="act-btn act-blue" onClick={() => updateUser(u.id, { is_admin: true })}>Make Admin</button>
                    )}
                    <button className="act-btn act-red" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTINGS */}
        {tab === 'Listings' && (
          <div className="admin-section">
            <div className="admin-table">
              <div className="admin-table-head">
                <span>Listing</span><span>Owner</span><span>Type</span><span>Status</span><span>Actions</span>
              </div>
              {listings.map(l => (
                <div key={l.id} className="admin-table-row">
                  <div>
                    <div className="listing-title-cell">{l.title || '—'}</div>
                    <div className="listing-location-cell">{l.suburb}, {l.state}</div>
                  </div>
                  <span className="listing-owner">{l.owner_name}</span>
                  <span className="listing-type">{l.type}</span>
                  <span className={`listing-status status-${l.status}`}>{l.status}</span>
                  <div className="admin-actions">
                    {l.status === 'active' ? (
                      <button className="act-btn act-orange" onClick={() => updateListing(l.id, 'suspended')}>Suspend</button>
                    ) : (
                      <button className="act-btn act-green" onClick={() => updateListing(l.id, 'active')}>Activate</button>
                    )}
                    <button className="act-btn act-red" onClick={() => deleteListing(l.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VERIFICATIONS */}
        {tab === 'Verifications' && (
          <div className="admin-section">
            {verifications.length === 0 ? (
              <p className="empty-text">No pending verifications. 🎉</p>
            ) : (
              <div className="verif-list">
                {verifications.map(v => (
                  <div key={v.id} className="verif-card">
                    <div className="verif-info">
                      <div className="verif-name">{v.user_name} <span className="verif-role">({v.user_role})</span></div>
                      <div className="verif-email">{v.user_email}</div>
                      <div className="verif-doc">Document: {v.document_type}</div>
                      <div className="verif-date">Submitted: {new Date(v.created_at).toLocaleDateString('en-AU')}</div>
                    </div>
                    <div className="verif-docs">
                      {v.document_url && <a href={v.document_url} target="_blank" rel="noreferrer" className="doc-link">📄 View ID</a>}
                      {v.selfie_url && <a href={v.selfie_url} target="_blank" rel="noreferrer" className="doc-link">🤳 View Selfie</a>}
                    </div>
                    <div className="verif-actions">
                      <button className="act-btn act-green" onClick={() => reviewVerification(v.id, 'approved')}>Approve</button>
                      <button className="act-btn act-red" onClick={() => reviewVerification(v.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
