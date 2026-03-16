import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Marketing.css'

const CONTACT_TYPES = ['all', 'general', 'buyer', 'seller', 'agent', 'landlord', 'tenant']

export default function Marketing() {
  const session = getSession()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [tab, setTab] = useState('contacts')
  const [contacts, setContacts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(null)

  // New contact form
  const [contactForm, setContactForm] = useState({ email: '', name: '', phone: '', type: 'general' })
  const [addingContact, setAddingContact] = useState(false)

  // Campaign form
  const [showCampForm, setShowCampForm] = useState(false)
  const [campForm, setCampForm] = useState({ name: '', subject: '', body: '', type: 'email', filter_type: 'all' })
  const [savingCamp, setSavingCamp] = useState(false)

  useEffect(() => {
    if (!session?.is_admin) { navigate('/'); return }
    loadAll()
  }, [])

  useEffect(() => {
    if (tab === 'contacts') loadContacts()
  }, [filterType, search])

  async function loadAll() {
    try {
      const [c, camps] = await Promise.all([
        api.marketing.contacts({ type: filterType, search }),
        api.marketing.campaigns(),
      ])
      setContacts(c.contacts)
      setTotal(c.total)
      setCampaigns(camps)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadContacts() {
    try {
      const c = await api.marketing.contacts({ type: filterType !== 'all' ? filterType : '', search })
      setContacts(c.contacts)
      setTotal(c.total)
    } catch {}
  }

  async function handleAddContact(e) {
    e.preventDefault()
    setAddingContact(true)
    try {
      const c = await api.marketing.addContact(contactForm)
      setContacts(prev => [c, ...prev])
      setTotal(t => t + 1)
      setContactForm({ email: '', name: '', phone: '', type: 'general' })
      setSuccess('Contact added')
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingContact(false)
    }
  }

  async function handleDeleteContact(id) {
    try {
      await api.marketing.deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      setTotal(t => t - 1)
    } catch (err) {
      setError(err.message)
    }
  }

  // CSV import
  async function handleCSVImport(e) {
    const file = e.target.files[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    const contacts = lines.slice(1).map(line => {
      const vals = line.split(',')
      const obj = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, '') })
      return obj
    }).filter(c => c.email)

    try {
      const result = await api.marketing.importContacts(contacts)
      setSuccess(`Imported ${result.imported} contacts (${result.skipped} skipped)`)
      await loadContacts()
    } catch (err) {
      setError(err.message)
    }

    e.target.value = ''
  }

  async function handleSaveCampaign(e) {
    e.preventDefault()
    setSavingCamp(true)
    try {
      const c = await api.marketing.createCampaign(campForm)
      setCampaigns(prev => [c, ...prev])
      setCampForm({ name: '', subject: '', body: '', type: 'email', filter_type: 'all' })
      setShowCampForm(false)
      setSuccess('Campaign created')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingCamp(false)
    }
  }

  async function handleSend(id) {
    if (!confirm('Send this campaign now to all matching contacts?')) return
    setSending(id)
    try {
      const result = await api.marketing.sendCampaign(id)
      setSuccess(result.message)
      const camps = await api.marketing.campaigns()
      setCampaigns(camps)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(null)
    }
  }

  if (!session?.is_admin) return null
  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>

  return (
    <div className="marketing-page">
      <div className="container">
        <div className="mkt-header">
          <h1>Marketing</h1>
          <div className="mkt-total">
            <span className="mkt-total-num">{total.toLocaleString()}</span>
            <span>contacts in database</span>
          </div>
        </div>

        {error && <div className="error-msg" onClick={() => setError('')}>{error} ✕</div>}
        {success && <div className="success-msg" onClick={() => setSuccess('')}>{success} ✕</div>}

        <div className="mkt-tabs">
          <button className={`mkt-tab ${tab === 'contacts' ? 'active' : ''}`} onClick={() => setTab('contacts')}>Contacts</button>
          <button className={`mkt-tab ${tab === 'campaigns' ? 'active' : ''}`} onClick={() => setTab('campaigns')}>Campaigns</button>
        </div>

        {/* CONTACTS TAB */}
        {tab === 'contacts' && (
          <div className="mkt-section">
            <div className="contacts-toolbar">
              <input
                className="mkt-search"
                placeholder="Search contacts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="mkt-filter">
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <label className="btn-outline-sm import-btn">
                📂 Import CSV
                <input type="file" accept=".csv" ref={fileRef} onChange={handleCSVImport} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Add contact form */}
            <form onSubmit={handleAddContact} className="add-contact-form">
              <input type="email" placeholder="Email *" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} required />
              <input type="text" placeholder="Name" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
              <input type="tel" placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
              <select value={contactForm.type} onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))}>
                {CONTACT_TYPES.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <button type="submit" className="btn-primary-sm" disabled={addingContact}>{addingContact ? 'Adding…' : '+ Add'}</button>
            </form>

            <div className="contacts-table">
              <div className="contacts-head">
                <span>Email</span><span>Name</span><span>Type</span><span>Source</span><span></span>
              </div>
              {contacts.length === 0 ? (
                <p className="empty-text">No contacts yet. Import a CSV or add contacts above.</p>
              ) : (
                contacts.map(c => (
                  <div key={c.id} className="contact-row">
                    <span className="contact-email">{c.email}</span>
                    <span>{c.name || '—'}</span>
                    <span className="contact-type">{c.type}</span>
                    <span className="contact-source">{c.source || '—'}</span>
                    <button className="delete-btn" onClick={() => handleDeleteContact(c.id)}>✕</button>
                  </div>
                ))
              )}
            </div>

            <p className="csv-hint">💡 CSV format: <code>email,name,phone,type</code> — type can be: buyer, seller, agent, landlord, tenant, general</p>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {tab === 'campaigns' && (
          <div className="mkt-section">
            <div className="camp-toolbar">
              <h2>Email Campaigns</h2>
              <button className="btn-primary-sm" onClick={() => setShowCampForm(!showCampForm)}>+ New Campaign</button>
            </div>

            {showCampForm && (
              <form onSubmit={handleSaveCampaign} className="camp-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Campaign Name *</label>
                    <input type="text" value={campForm.name} onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. March buyer outreach" />
                  </div>
                  <div className="form-group">
                    <label>Send To</label>
                    <select value={campForm.filter_type} onChange={e => setCampForm(f => ({ ...f, filter_type: e.target.value }))}>
                      {CONTACT_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All contacts' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Subject Line *</label>
                  <input type="text" value={campForm.subject} onChange={e => setCampForm(f => ({ ...f, subject: e.target.value }))} required placeholder="e.g. 10,000 buyers are waiting on Houzeey" />
                </div>
                <div className="form-group">
                  <label>Email Body * — use {'{{name}}'} for personalisation</label>
                  <textarea value={campForm.body} onChange={e => setCampForm(f => ({ ...f, body: e.target.value }))} rows={8} required placeholder={`Hi {{name}},\n\nWe have over 10,000 buyers actively looking for property on Houzeey...\n\nhttps://www.houzeey.com\n\nThe Houzeey Team`} />
                </div>
                <div className="camp-form-actions">
                  <button type="submit" className="btn-primary-sm" disabled={savingCamp}>{savingCamp ? 'Saving…' : 'Save Campaign'}</button>
                  <button type="button" className="btn-outline-sm" onClick={() => setShowCampForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="campaigns-list">
              {campaigns.length === 0 ? (
                <p className="empty-text">No campaigns yet. Create your first campaign above.</p>
              ) : (
                campaigns.map(c => (
                  <div key={c.id} className="camp-card">
                    <div className="camp-info">
                      <div className="camp-name">{c.name}</div>
                      <div className="camp-subject">{c.subject}</div>
                      <div className="camp-meta">
                        To: <strong>{c.filter_type === 'all' ? 'All contacts' : c.filter_type + 's'}</strong>
                        {c.sent_at && <> · Sent {new Date(c.sent_at).toLocaleDateString('en-AU')} · {c.sent_count} sent, {c.failed_count} failed</>}
                      </div>
                    </div>
                    <div className="camp-right">
                      <span className={`camp-status camp-status--${c.status}`}>{c.status}</span>
                      {c.status === 'draft' && (
                        <button
                          className="btn-primary-sm"
                          onClick={() => handleSend(c.id)}
                          disabled={sending === c.id}
                        >
                          {sending === c.id ? 'Sending…' : '📨 Send Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
