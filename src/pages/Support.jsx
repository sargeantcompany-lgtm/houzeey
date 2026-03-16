import { useState, useEffect } from 'react'
import { api } from '../api'
import { getSession } from '../auth'
import './Support.css'

const TICKET_TYPES = [
  { value: 'general', label: 'General enquiry' },
  { value: 'listing', label: 'Listing issue' },
  { value: 'account', label: 'Account problem' },
  { value: 'payment', label: 'Payment issue' },
  { value: 'dispute', label: 'Transaction dispute' },
  { value: 'abuse', label: 'Report user/content' },
  { value: 'verification', label: 'Identity verification' },
  { value: 'other', label: 'Other' },
]

export default function Support() {
  const session = getSession()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'general', subject: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      api.support.mine().then(setTickets).catch(() => {}).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [session])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const ticket = await api.support.create(form)
      setTickets(prev => [ticket, ...prev])
      setForm({ type: 'general', subject: '', description: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err.message || 'Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (s) => ({
    open: { bg: '#fff8e1', color: '#b45309', label: 'Open' },
    in_progress: { bg: '#e8f0ff', color: '#3a5cbf', label: 'In Progress' },
    resolved: { bg: 'var(--green-light)', color: 'var(--green-dark)', label: 'Resolved' },
    closed: { bg: '#f5f5f5', color: '#666', label: 'Closed' },
  }[s] || { bg: '#f5f5f5', color: '#666', label: s })

  return (
    <div className="support-page">
      <div className="container">
        <div className="support-hero">
          <h1>Support & Help</h1>
          <p>Have a problem or question? We're here to help. Submit a ticket and our team will get back to you shortly.</p>
        </div>

        <div className="support-grid">
          {/* Submit form */}
          <div className="support-card">
            <h2>Submit a ticket</h2>

            {success && (
              <div className="support-success">
                ✓ Your ticket has been submitted. We'll respond via email within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label>
                Type
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label>
                Subject
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Briefly describe your issue"
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={6}
                  placeholder="Please provide as much detail as possible, including any relevant listing IDs, dates, or screenshots."
                  required
                />
              </label>

              {error && <p className="support-error">{error}</p>}

              {!session && <p className="support-note">You need to be logged in to submit a support ticket.</p>}

              <button type="submit" className="support-btn" disabled={submitting || !session}>
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </button>
            </form>
          </div>

          {/* My tickets + FAQ */}
          <div>
            {/* FAQ */}
            <div className="support-card">
              <h2>Common questions</h2>
              <div className="faq-list">
                {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
              </div>
            </div>

            {/* Existing tickets */}
            {session && (
              <div className="support-card" style={{ marginTop: 20 }}>
                <h2>My tickets</h2>
                {loading ? <p className="support-empty">Loading…</p>
                  : tickets.length === 0 ? <p className="support-empty">No tickets yet.</p>
                  : (
                    <div className="tickets-list">
                      {tickets.map(t => {
                        const badge = statusBadge(t.status)
                        return (
                          <div key={t.id} className="ticket-row">
                            <div className="ticket-info">
                              <div className="ticket-subject">{t.subject}</div>
                              <div className="ticket-meta">{TICKET_TYPES.find(x => x.value === t.type)?.label} · {new Date(t.created_at).toLocaleDateString('en-AU')}</div>
                              {t.admin_response && <div className="ticket-response"><strong>Response:</strong> {t.admin_response}</div>}
                            </div>
                            <span className="ticket-status" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        {q}
        <span className={`faq-arrow ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

const FAQS = [
  { q: 'How do I list my property?', a: 'Log in, click "Sell" in the nav, and follow the 4-step listing wizard. Your listing goes live instantly once published.' },
  { q: 'Are there any listing fees?', a: 'Houzeey is free to list during our launch phase. We may introduce optional premium features in the future.' },
  { q: 'How does the offer process work?', a: 'Buyers submit a structured offer through the platform. Sellers can accept, reject, or counter. All activity is logged with timestamps.' },
  { q: 'How do I verify my identity?', a: 'Go to Dashboard → Verify Identity. Upload a photo ID and an optional selfie. Our team reviews and approves within 1 business day.' },
  { q: 'What happens after a rental application is approved?', a: 'The landlord marks your application approved, then you can proceed to sign the lease and arrange a bond through the platform.' },
  { q: 'How do I report a suspicious listing or user?', a: 'Use this support form and select "Report user/content" as the ticket type. Include as much detail as possible.' },
  { q: 'Can I use Houzeey as a buyer\'s agent?', a: 'Yes. Register with the "Buyer Agent" role and you\'ll get access to the buyer agent portal to manage client searches and offers.' },
]
