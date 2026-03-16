import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Offers.css'

function fmt(amount) {
  return `$${Number(amount).toLocaleString('en-AU')}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_BADGE = {
  pending: { label: 'Pending', cls: 'badge-orange' },
  countered: { label: 'Countered', cls: 'badge-blue' },
  accepted: { label: 'Accepted', cls: 'badge-green' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
  withdrawn: { label: 'Withdrawn', cls: 'badge-grey' },
}

// ————— Make Offer Form —————
function MakeOfferForm({ listingId, sellerId, onSuccess }) {
  const [form, setForm] = useState({
    offer_price: '', settlement_date: '', deposit_amount: '', deposit_due_days: 7,
    finance_clause: false, finance_days: 21, building_inspection: false, building_days: 14,
    inclusions: '', exclusions: '', conditions: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const offer = await api.offers.submit({ ...form, listing_id: listingId })
      onSuccess(offer)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="offer-form">
      <h2>Make an Offer</h2>

      <div className="form-row">
        <div className="form-group">
          <label>Offer Price (AUD) *</label>
          <input type="number" value={form.offer_price} onChange={set('offer_price')} placeholder="e.g. 850000" required />
        </div>
        <div className="form-group">
          <label>Proposed Settlement Date</label>
          <input type="date" value={form.settlement_date} onChange={set('settlement_date')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Deposit Amount (AUD)</label>
          <input type="number" value={form.deposit_amount} onChange={set('deposit_amount')} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label>Deposit Due (days after acceptance)</label>
          <input type="number" value={form.deposit_due_days} onChange={set('deposit_due_days')} min="1" max="30" />
        </div>
      </div>

      <div className="form-row clauses">
        <label className="checkbox-label">
          <input type="checkbox" checked={form.finance_clause} onChange={set('finance_clause')} />
          Finance clause
        </label>
        {form.finance_clause && (
          <div className="form-group inline">
            <label>Finance days</label>
            <input type="number" value={form.finance_days} onChange={set('finance_days')} min="1" max="90" />
          </div>
        )}
      </div>

      <div className="form-row clauses">
        <label className="checkbox-label">
          <input type="checkbox" checked={form.building_inspection} onChange={set('building_inspection')} />
          Building & pest inspection clause
        </label>
        {form.building_inspection && (
          <div className="form-group inline">
            <label>Inspection days</label>
            <input type="number" value={form.building_days} onChange={set('building_days')} min="1" max="90" />
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Inclusions (items included in sale)</label>
        <input type="text" value={form.inclusions} onChange={set('inclusions')} placeholder="e.g. dishwasher, blinds, garden shed" />
      </div>

      <div className="form-group">
        <label>Exclusions</label>
        <input type="text" value={form.exclusions} onChange={set('exclusions')} placeholder="e.g. outdoor furniture" />
      </div>

      <div className="form-group">
        <label>Special Conditions</label>
        <textarea value={form.conditions} onChange={set('conditions')} rows={3} placeholder="Any special conditions…" />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Offer'}
      </button>
    </form>
  )
}

// ————— Offer Detail / Negotiation —————
function OfferDetail({ offerId, currentUser }) {
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [counter, setCounter] = useState({ offer_price: '', settlement_date: '', conditions: '', note: '' })
  const [showCounter, setShowCounter] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.offers.get(offerId).then(setOffer).catch(() => {}).finally(() => setLoading(false))
  }, [offerId])

  async function handleAction(action) {
    setActing(true)
    setError('')
    try {
      if (action === 'accept') await api.offers.accept(offerId)
      else if (action === 'reject') await api.offers.reject(offerId)
      else if (action === 'withdraw') await api.offers.withdraw(offerId)
      const updated = await api.offers.get(offerId)
      setOffer(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(false)
    }
  }

  async function handleCounter(e) {
    e.preventDefault()
    setActing(true)
    setError('')
    try {
      await api.offers.counter(offerId, counter)
      const updated = await api.offers.get(offerId)
      setOffer(updated)
      setShowCounter(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(false)
    }
  }

  if (loading) return <p>Loading offer…</p>
  if (!offer) return <p>Offer not found.</p>

  const isSeller = offer.seller_id === currentUser?.id
  const isBuyer = offer.buyer_id === currentUser?.id
  const isActive = ['pending', 'countered'].includes(offer.status)
  const badge = STATUS_BADGE[offer.status] || {}

  return (
    <div className="offer-detail">
      <div className="offer-detail-header">
        <div>
          <h2>{offer.listing_title}</h2>
          <p className="offer-address">{offer.listing_address}</p>
        </div>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="offer-terms-grid">
        <div className="offer-term"><span>Offer Price</span><strong>{fmt(offer.offer_price)}</strong></div>
        <div className="offer-term"><span>Settlement</span><strong>{fmtDate(offer.settlement_date)}</strong></div>
        <div className="offer-term"><span>Deposit</span><strong>{offer.deposit_amount ? fmt(offer.deposit_amount) : '—'}</strong></div>
        <div className="offer-term"><span>Finance Clause</span><strong>{offer.finance_clause ? `Yes (${offer.finance_days} days)` : 'No'}</strong></div>
        <div className="offer-term"><span>B&P Inspection</span><strong>{offer.building_inspection ? `Yes (${offer.building_days} days)` : 'No'}</strong></div>
        <div className="offer-term"><span>Inclusions</span><strong>{offer.inclusions || '—'}</strong></div>
      </div>

      {offer.conditions && (
        <div className="offer-conditions">
          <strong>Special Conditions:</strong>
          <p>{offer.conditions}</p>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {/* Actions */}
      {isActive && (
        <div className="offer-actions">
          {isSeller && (
            <>
              <button className="btn-green" onClick={() => handleAction('accept')} disabled={acting}>Accept Offer</button>
              <button className="btn-outline" onClick={() => setShowCounter(!showCounter)} disabled={acting}>Counter Offer</button>
              <button className="btn-danger" onClick={() => handleAction('reject')} disabled={acting}>Reject</button>
            </>
          )}
          {isBuyer && (
            <button className="btn-danger" onClick={() => handleAction('withdraw')} disabled={acting}>Withdraw Offer</button>
          )}
        </div>
      )}

      {/* Counter form */}
      {showCounter && isSeller && (
        <form onSubmit={handleCounter} className="counter-form">
          <h3>Counter Offer</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Counter Price</label>
              <input type="number" value={counter.offer_price} onChange={e => setCounter(f => ({ ...f, offer_price: e.target.value }))} placeholder={offer.offer_price} />
            </div>
            <div className="form-group">
              <label>New Settlement Date</label>
              <input type="date" value={counter.settlement_date} onChange={e => setCounter(f => ({ ...f, settlement_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Note to buyer</label>
            <textarea value={counter.note} onChange={e => setCounter(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="Explain your counter…" />
          </div>
          <button type="submit" className="btn-green" disabled={acting}>{acting ? 'Sending…' : 'Send Counter Offer'}</button>
        </form>
      )}

      {/* Settlement link if accepted */}
      {offer.status === 'accepted' && (
        <div className="offer-accepted-banner">
          <span>🎉 Offer accepted!</span>
          <div className="offer-accepted-actions">
            <Link to={`/settlement/${offer.id}`} className="btn-green">View Settlement Tracker →</Link>
            <a href={api.offers.pdf(offer.id)} target="_blank" rel="noreferrer" className="btn-outline">Download Letter of Offer (PDF)</a>
          </div>
        </div>
      )}

      {/* History */}
      <div className="offer-history">
        <h3>Negotiation History</h3>
        {offer.history?.length === 0 ? (
          <p className="empty-text">No history yet.</p>
        ) : (
          <div className="history-list">
            {offer.history?.map(h => (
              <div key={h.id} className="history-item">
                <div className="history-meta">
                  <span className={`badge ${h.made_by_role === 'buyer' ? 'badge-blue' : 'badge-green'}`}>{h.made_by_role}</span>
                  <span className="history-action">{h.action}</span>
                  <span className="history-name">{h.made_by_name}</span>
                  <span className="history-date">{fmtDate(h.created_at)}</span>
                </div>
                {h.offer_price && <div className="history-price">{fmt(h.offer_price)}</div>}
                {h.note && <div className="history-note">"{h.note}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ————— Main Page —————
export default function Offers() {
  const { listingId, offerId } = useParams()
  const navigate = useNavigate()
  const session = getSession()

  const [listing, setListing] = useState(null)
  const [offers, setOffers] = useState([])
  const [myOffers, setMyOffers] = useState([])
  const [view, setView] = useState(offerId ? 'detail' : (listingId ? 'make' : 'mine'))
  const [selectedOffer, setSelectedOffer] = useState(offerId || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const promises = []
    if (listingId) {
      promises.push(api.listings.get(listingId))
    }
    promises.push(api.offers.mine())

    Promise.all(promises).then(results => {
      if (listingId) {
        setListing(results[0])
        if (results[0].user_id === session?.id) {
          api.offers.forListing(listingId).then(setOffers).catch(() => {})
        }
        setMyOffers(results[1])
      } else {
        setMyOffers(results[0])
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [listingId])

  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>

  // My offers dashboard (no listingId)
  if (!listingId) {
    return (
      <div className="offers-page">
        <div className="container">
          <h1>My Offers</h1>
          {selectedOffer ? (
            <>
              <button className="back-btn" onClick={() => setSelectedOffer(null)}>← All offers</button>
              <OfferDetail offerId={selectedOffer} currentUser={session} />
            </>
          ) : (
            <div className="offers-list">
              {myOffers.length === 0 ? (
                <p className="empty-text">You haven't made any offers yet. Browse listings to make your first offer.</p>
              ) : (
                myOffers.map(o => {
                  const badge = STATUS_BADGE[o.status] || {}
                  return (
                    <div key={o.id} className="offer-row" onClick={() => setSelectedOffer(o.id)}>
                      <div>
                        <div className="offer-row-title">{o.listing_title}</div>
                        <div className="offer-row-sub">{o.listing_suburb} · Seller: {o.seller_name}</div>
                      </div>
                      <div className="offer-row-right">
                        <div className="offer-row-price">{fmt(o.offer_price)}</div>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const isOwner = listing?.user_id === session?.id

  return (
    <div className="offers-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(`/listing/${listingId}`)}>← Back to listing</button>
        <h1>{isOwner ? 'Offers Received' : 'Make an Offer'}</h1>
        {listing && <p className="offers-listing-title">{listing.title} — {listing.suburb}, {listing.state}</p>}

        {selectedOffer ? (
          <>
            <button className="back-btn" onClick={() => setSelectedOffer(null)}>← All offers</button>
            <OfferDetail offerId={selectedOffer} currentUser={session} />
          </>
        ) : isOwner ? (
          <div className="offers-list">
            {offers.length === 0 ? (
              <p className="empty-text">No offers received yet.</p>
            ) : (
              offers.map(o => {
                const badge = STATUS_BADGE[o.status] || {}
                return (
                  <div key={o.id} className="offer-row" onClick={() => setSelectedOffer(o.id)}>
                    <div>
                      <div className="offer-row-title">{o.buyer_name}</div>
                      <div className="offer-row-sub">{fmtDate(o.created_at)}</div>
                    </div>
                    <div className="offer-row-right">
                      <div className="offer-row-price">{fmt(o.offer_price)}</div>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <MakeOfferForm listingId={listingId} onSuccess={o => { setSelectedOffer(o.id); setView('detail') }} />
        )}
      </div>
    </div>
  )
}
