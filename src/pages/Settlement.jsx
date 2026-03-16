import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Settlement.css'

function fmtDate(d) {
  if (!d) return 'No date set'
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Settlement() {
  const { offerId } = useParams()
  const navigate = useNavigate()
  const session = getSession()

  const [offer, setOffer] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.offers.get(offerId),
      api.settlement.get(offerId),
    ])
      .then(([o, m]) => { setOffer(o); setMilestones(m) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [offerId])

  async function toggleMilestone(milestone) {
    setToggling(milestone.id)
    try {
      const updated = await api.settlement.updateMilestone(offerId, milestone.id, !milestone.completed)
      setMilestones(prev => prev.map(m => m.id === milestone.id ? updated : m))
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling(null)
    }
  }

  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>
  if (!offer) return <div className="container"><p>Offer not found.</p></div>

  const completed = milestones.filter(m => m.completed).length
  const total = milestones.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="settlement-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="settlement-header">
          <div>
            <h1>Settlement Tracker</h1>
            <p className="settlement-property">{offer.listing_title} — {offer.listing_address}</p>
          </div>
          <a href={api.offers.pdf(offerId)} target="_blank" rel="noreferrer" className="btn-outline-sm">
            📄 Letter of Offer PDF
          </a>
        </div>

        {/* Offer summary */}
        <div className="settlement-summary">
          <div className="summary-item"><span>Agreed Price</span><strong>${Number(offer.offer_price).toLocaleString('en-AU')}</strong></div>
          <div className="summary-item"><span>Settlement Date</span><strong>{fmtDate(offer.settlement_date)}</strong></div>
          <div className="summary-item"><span>Buyer</span><strong>{offer.buyer_name}</strong></div>
          <div className="summary-item"><span>Seller</span><strong>{offer.seller_name}</strong></div>
        </div>

        {/* Progress bar */}
        <div className="progress-section">
          <div className="progress-label">
            <span>Settlement Progress</span>
            <span>{completed} of {total} milestones complete</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-pct">{progress}% complete</div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Milestones */}
        <div className="milestones-list">
          {milestones.map((m, i) => (
            <div key={m.id} className={`milestone ${m.completed ? 'milestone--done' : ''}`}>
              <div className="milestone-number">{i + 1}</div>
              <div className="milestone-content">
                <div className="milestone-title">{m.title}</div>
                <div className="milestone-desc">{m.description}</div>
                <div className="milestone-due">Due: {fmtDate(m.due_date)}</div>
                {m.completed && m.completed_by_name && (
                  <div className="milestone-completed-by">Completed by {m.completed_by_name}</div>
                )}
              </div>
              <button
                className={`milestone-check ${m.completed ? 'milestone-check--done' : ''}`}
                onClick={() => toggleMilestone(m)}
                disabled={toggling === m.id}
                title={m.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {m.completed ? '✓' : '○'}
              </button>
            </div>
          ))}
        </div>

        {progress === 100 && (
          <div className="settlement-complete">
            🎉 <strong>All milestones complete!</strong> Settlement is done.
          </div>
        )}
      </div>
    </div>
  )
}
