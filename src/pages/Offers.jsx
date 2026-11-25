import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
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
function MakeOfferForm({ listingId, onSuccess }) {
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
          <input type="number" value={form.offer_price} onChange={set('offer_price')} placeholder="e.g. 850000" min="1" step="1" inputMode="numeric" required />
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
  const [loadError, setLoadError] = useState('')
  const [counter, setCounter] = useState({ offer_price: '', settlement_date: '', conditions: '', note: '' })
  const [showCounter, setShowCounter] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    api.offers.get(offerId)
      .then(data => { if (active) setOffer(data) })
      .catch(err => { if (active) setLoadError(err.message || 'Could not load this offer.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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

  if (loading) return <p className="loading-text">Loading offer…</p>
  if (!offer) return <p className="error-msg" role="alert">{loadError || 'Offer not found.'}</p>

  const isSeller = offer.seller_id === currentUser?.id
  const isBuyer = offer.buyer_id === currentUser?.id
  const isActive = ['pending', 'countered'].includes(offer.status)
  const currentOfferBy = offer.current_offer_by || 'buyer'
  const canRespond = isSeller
    ? currentOfferBy === 'buyer'
    : isBuyer && currentOfferBy === 'seller'
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
        <div className="offer-term"><span>Deposit due</span><strong>{offer.deposit_amount ? `${offer.deposit_due_days || 7} days after acceptance` : '—'}</strong></div>
        <div className="offer-term"><span>Finance Clause</span><strong>{offer.finance_clause ? `Yes (${offer.finance_days} days)` : 'No'}</strong></div>
        <div className="offer-term"><span>B&P Inspection</span><strong>{offer.building_inspection ? `Yes (${offer.building_days} days)` : 'No'}</strong></div>
        <div className="offer-term"><span>Inclusions</span><strong>{offer.inclusions || '—'}</strong></div>
        <div className="offer-term"><span>Exclusions</span><strong>{offer.exclusions || '—'}</strong></div>
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
          {canRespond && (
            <>
              <button className="btn-green" onClick={() => handleAction('accept')} disabled={acting}>Accept {fmt(offer.offer_price)}</button>
              <button className="btn-outline" onClick={() => setShowCounter(!showCounter)} disabled={acting}>Counter Offer</button>
              {isSeller && <button className="btn-danger" onClick={() => handleAction('reject')} disabled={acting}>Reject</button>}
            </>
          )}
          {!canRespond && (
            <p className="offer-waiting" role="status">Waiting for the {isBuyer ? 'seller' : 'buyer'} to respond to the latest offer.</p>
          )}
          {isBuyer && (
            <button className="btn-danger" onClick={() => handleAction('withdraw')} disabled={acting}>Withdraw Offer</button>
          )}
        </div>
      )}

      {/* Counter form */}
      {showCounter && canRespond && (
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
            <label>Message to the other party</label>
            <textarea value={counter.note} onChange={e => setCounter(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="Explain your counter…" />
          </div>
          <button type="submit" className="btn-green" disabled={acting}>{acting ? 'Sending…' : 'Send Counter Offer'}</button>
        </form>
      )}

      {/* Settlement link if accepted */}
      {offer.status === 'accepted' && (
        <div className="offer-accepted-banner">
          <div>
            <span>Offer accepted</span>
            <p>Have your solicitor or conveyancer review the agreed terms and prepare the contract. Acceptance here is not a substitute for a signed contract.</p>
          </div>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const session = getSession()

  const [listing, setListing] = useState(null)
  const [receivedOffers, setReceivedOffers] = useState([])
  const [madeOffers, setMadeOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const requestedTab = searchParams.get('tab')
  // With no tab chosen, open the one that has offers: sellers usually have
  // received offers and none made, so landing on an empty "made" tab hides them.
  const activeTab = requestedTab === 'received' || requestedTab === 'made'
    ? requestedTab
    : (madeOffers.length === 0 && receivedOffers.length > 0 ? 'received' : 'made')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        if (listingId) {
          const property = await api.listings.get(listingId)
          if (!active) return
          setListing(property)
          if (property.user_id === session?.id) {
            const data = await api.offers.forListing(listingId)
            if (active) setReceivedOffers(data)
          }
        } else if (!offerId) {
          const [made, received] = await Promise.all([
            api.offers.mine(),
            api.offers.received(),
          ])
          if (active) {
            setMadeOffers(made)
            setReceivedOffers(received)
          }
        }
      } catch (err) {
        if (active) setLoadError(err.message || 'Could not load offers right now.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [listingId, offerId, session?.id])

  function changeTab(tab) {
    setSearchParams({ tab })
  }

  if (loading) return <div className="container"><p className="loading-text">Loading offers…</p></div>

  if (offerId) {
    return (
      <div className="offers-page">
        <div className="container">
          <Link className="back-btn" to={activeTab === 'received' ? '/offers?tab=received' : '/offers'}>← All offers</Link>
          <OfferDetail offerId={offerId} currentUser={session} />
        </div>
      </div>
    )
  }

  if (listingId) {
    const isOwner = listing?.user_id === session?.id
    return (
      <div className="offers-page">
        <div className="container">
          <Link className="back-btn" to={`/listing/${listingId}`}>← Back to listing</Link>
          {loadError ? (
            <p className="error-msg" role="alert">{loadError}</p>
          ) : (
            <>
              <p className="offers-kicker">Direct negotiation</p>
              <h1>{isOwner ? 'Offers on your listing' : 'Make an offer'}</h1>
              {listing && <p className="offers-listing-title">{listing.title} — {listing.suburb}, {listing.state}</p>}
              <OfferGuidance />
              {isOwner ? (
                <OfferList
                  offers={receivedOffers}
                  side="seller"
                  emptyTitle="No offers received yet"
                  emptyMessage="New buyer offers for this listing will appear here."
                />
              ) : (
                <MakeOfferForm
                  listingId={listingId}
                  onSuccess={offer => navigate(`/offers/view/${offer.id}`)}
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="offers-page">
      <div className="container">
        <p className="offers-kicker">Negotiate direct</p>
        <h1>Offers and negotiations</h1>
        <p className="offers-listing-title">Make, receive and respond to offers in one place. Every counter and decision is saved in the negotiation history.</p>
        <OfferGuidance />

        {loadError && <p className="error-msg" role="alert">{loadError}</p>}

        <div className="offers-tabs" role="tablist" aria-label="Offers">
          <button type="button" role="tab" aria-selected={activeTab === 'made'} className={`offers-tab ${activeTab === 'made' ? 'active' : ''}`} onClick={() => changeTab('made')}>
            Offers I’ve made <span>{madeOffers.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'received'} className={`offers-tab ${activeTab === 'received' ? 'active' : ''}`} onClick={() => changeTab('received')}>
            Offers on my listings <span>{receivedOffers.length}</span>
          </button>
        </div>

        {activeTab === 'made' ? (
          <OfferList
            offers={madeOffers}
            side="buyer"
            emptyTitle="You haven’t made an offer yet"
            emptyMessage="Browse owner-listed homes and make an offer directly to the seller."
            emptyAction={<Link className="offers-empty-link" to="/buy">Browse homes for sale →</Link>}
          />
        ) : (
          <OfferList
            offers={receivedOffers}
            side="seller"
            emptyTitle="No offers on your listings yet"
            emptyMessage="When a buyer makes an offer on one of your active listings, you’ll find it here."
            emptyAction={<Link className="offers-empty-link" to="/sell">List your home →</Link>}
          />
        )}
      </div>
    </div>
  )
}

function OfferGuidance() {
  return (
    <section className="offers-guidance" aria-labelledby="offers-guidance-title">
      <div>
        <p className="offers-guidance-kicker">A clear record, from offer to handover</p>
        <h2 id="offers-guidance-title">Negotiate directly. Keep the important details together.</h2>
        <p>Set the price, deposit, settlement timing and conditions. The other party can accept, counter or decline, and the agreed terms can be shared with your conveyancers.</p>
      </div>
      <ol>
        <li><span>01</span><strong>Send terms</strong><small>Include your price and conditions.</small></li>
        <li><span>02</span><strong>Respond or counter</strong><small>Both sides can take turns.</small></li>
        <li><span>03</span><strong>Ask your solicitor</strong><small>Have the formal contract prepared.</small></li>
      </ol>
    </section>
  )
}

function OfferList({ offers, side, emptyTitle, emptyMessage, emptyAction }) {
  if (offers.length === 0) {
    return (
      <div className="offers-empty">
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="offers-list">
      {offers.map(offer => {
        const badge = STATUS_BADGE[offer.status] || { label: offer.status, cls: 'badge-grey' }
        const otherParty = side === 'buyer'
          ? `Seller: ${offer.seller_name || 'Owner'}`
          : `Buyer: ${offer.buyer_name || 'Buyer'}`
        return (
          <Link
            key={offer.id}
            to={`/offers/view/${offer.id}?tab=${side === 'seller' ? 'received' : 'made'}`}
            className="offer-row"
          >
            <div>
              <div className="offer-row-title">{offer.listing_title || 'Property offer'}</div>
              <div className="offer-row-sub">{offer.listing_suburb || offer.listing_address || 'Property'} · {otherParty} · Updated {fmtDate(offer.updated_at || offer.created_at)}</div>
            </div>
            <div className="offer-row-right">
              <div className="offer-row-price">{fmt(offer.offer_price)}</div>
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
