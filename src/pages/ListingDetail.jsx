import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { isLoggedIn, getSession } from '../auth'
import './ListingDetail.css'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reviews, setReviews] = useState({ reviews: [], avg_rating: 0, count: 0 })
  const [tab, setTab] = useState('about')

  // Mortgage calculator state
  const [calc, setCalc] = useState({ deposit: '', rate: '6.5', years: '30' })
  const [calcResult, setCalcResult] = useState(null)

  useEffect(() => {
    api.listings.get(id)
      .then(data => {
        setListing(data)
        // Load reviews for the seller
        return api.reviews.get(data.user_id)
      })
      .then(rev => setReviews(rev))
      .catch(() => setError('Property not found'))
      .finally(() => setLoading(false))
  }, [id])

  // Pre-fill deposit on listing load (10% default)
  useEffect(() => {
    if (listing?.price && listing.type === 'sale') {
      setCalc(c => ({ ...c, deposit: Math.round(listing.price * 0.1).toString() }))
    }
  }, [listing])

  const imgs = listing?.images?.length > 0
    ? listing.images.map(img => img.url)
    : [PLACEHOLDER]

  async function handleContact(e) {
    e.preventDefault()
    if (!isLoggedIn()) { navigate('/login', { state: { from: { pathname: `/listing/${id}` } } }); return }
    const session = getSession()
    if (session.id === listing.user_id) return

    setSending(true)
    try {
      await api.conversations.start({ recipient_id: listing.user_id, listing_id: listing.id, message })
      setSent(true)
      setMessage('')
    } catch (err) {
      alert(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function toggleSave() {
    if (!isLoggedIn()) { navigate('/login'); return }
    setSaving(true)
    try {
      if (saved) {
        await api.saved.unsave(listing.id)
        setSaved(false)
      } else {
        await api.saved.save(listing.id)
        setSaved(true)
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  function calcMortgage() {
    const price = Number(listing?.price) || 0
    const deposit = Number(calc.deposit) || 0
    const principal = price - deposit
    const r = Number(calc.rate) / 100 / 12
    const n = Number(calc.years) * 12

    if (principal <= 0 || r <= 0 || n <= 0) return

    const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const total = monthly * n
    const totalInterest = total - principal

    setCalcResult({
      monthly: monthly.toFixed(0),
      total: total.toFixed(0),
      totalInterest: totalInterest.toFixed(0),
      principal,
      lvr: ((principal / price) * 100).toFixed(0),
    })
  }

  const formatPrice = (p, type) => {
    if (p == null) return 'Contact agent'
    return type === 'rent' ? `$${Number(p).toLocaleString()}/wk` : `$${Number(p).toLocaleString()}`
  }

  if (loading) return <div className="detail-page"><div className="container"><p>Loading…</p></div></div>
  if (error || !listing) return <div className="detail-page"><div className="container"><p>{error || 'Not found'}</p></div></div>

  const session = getSession()
  const isOwner = session?.id === listing.user_id
  const sellerInitial = (listing.seller_name || '?')[0].toUpperCase()
  const sellerSince = listing.seller_since
    ? new Date(listing.seller_since).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    : 'Unknown'

  return (
    <div className="detail-page">
      <div className="container">
        <nav className="breadcrumb">
          <Link to="/">Home</Link> › <Link to={listing.type === 'sale' ? '/buy' : '/rent'}>{listing.type === 'sale' ? 'Buy' : 'Rent'}</Link> › <span>{listing.title}</span>
        </nav>

        <div className="detail-grid">
          {/* Left: images + info */}
          <div className="detail-main">
            <div className="gallery">
              <div className="gallery-main">
                <img src={imgs[activeImg]} alt={listing.title} />
                <button className="gallery-save-btn" onClick={toggleSave} disabled={saving} title={saved ? 'Unsave' : 'Save'}>
                  {saved ? '♥' : '♡'}
                </button>
              </div>
              {imgs.length > 1 && (
                <div className="gallery-thumbs">
                  {imgs.map((img, i) => (
                    <button key={i} className={`thumb ${activeImg === i ? 'active' : ''}`} onClick={() => setActiveImg(i)}>
                      <img src={img} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-stats">
              {listing.beds != null && <div className="stat"><span className="stat-val">{listing.beds}</span><span>Beds</span></div>}
              {listing.baths != null && <div className="stat"><span className="stat-val">{listing.baths}</span><span>Baths</span></div>}
              {listing.cars != null && <div className="stat"><span className="stat-val">{listing.cars}</span><span>Cars</span></div>}
              {listing.land_size != null && <div className="stat"><span className="stat-val">{listing.land_size}m²</span><span>Land</span></div>}
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
              {['about', ...(listing.type === 'sale' ? ['mortgage'] : []), 'reviews'].map(t => (
                <button key={t} className={`detail-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {{ about: 'About', mortgage: 'Mortgage Calculator', reviews: `Reviews (${reviews.count})` }[t]}
                </button>
              ))}
            </div>

            {tab === 'about' && listing.description && (
              <div className="detail-section">
                {listing.description.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}

            {tab === 'mortgage' && listing.type === 'sale' && (
              <div className="detail-section mortgage-section">
                <h3>Repayment estimator</h3>
                <p className="calc-disclaimer">This is an estimate only. Contact a mortgage broker for personalised advice.</p>
                <div className="calc-fields">
                  <label>
                    Property price
                    <input type="text" value={`$${Number(listing.price).toLocaleString()}`} readOnly />
                  </label>
                  <label>
                    Deposit ($)
                    <input type="number" value={calc.deposit} onChange={e => setCalc(c => ({ ...c, deposit: e.target.value }))} />
                  </label>
                  <label>
                    Interest rate (%)
                    <input type="number" step="0.1" value={calc.rate} onChange={e => setCalc(c => ({ ...c, rate: e.target.value }))} />
                  </label>
                  <label>
                    Loan term (years)
                    <select value={calc.years} onChange={e => setCalc(c => ({ ...c, years: e.target.value }))}>
                      {[10, 15, 20, 25, 30].map(y => <option key={y} value={y}>{y} years</option>)}
                    </select>
                  </label>
                </div>
                <button className="calc-btn" onClick={calcMortgage}>Calculate repayments</button>

                {calcResult && (
                  <div className="calc-results">
                    <div className="calc-main-result">
                      <span className="calc-amount">${Number(calcResult.monthly).toLocaleString()}</span>
                      <span>estimated monthly repayment</span>
                    </div>
                    <div className="calc-breakdown">
                      <div className="calc-row"><span>Loan amount</span><strong>${Number(calcResult.principal).toLocaleString()}</strong></div>
                      <div className="calc-row"><span>LVR</span><strong>{calcResult.lvr}%{calcResult.lvr > 80 ? ' (LMI may apply)' : ''}</strong></div>
                      <div className="calc-row"><span>Total interest</span><strong>${Number(calcResult.totalInterest).toLocaleString()}</strong></div>
                      <div className="calc-row"><span>Total repaid</span><strong>${Number(calcResult.total).toLocaleString()}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="detail-section">
                {reviews.count === 0 ? (
                  <p className="detail-empty">No reviews for this seller yet.</p>
                ) : (
                  <>
                    <div className="detail-reviews-summary">
                      <span className="detail-avg">{reviews.avg_rating}</span>
                      <div>
                        <div className="review-stars-lg">{'★'.repeat(Math.round(reviews.avg_rating))}{'☆'.repeat(5 - Math.round(reviews.avg_rating))}</div>
                        <span className="detail-review-count">{reviews.count} reviews for {listing.seller_name}</span>
                      </div>
                    </div>
                    {reviews.reviews.slice(0, 5).map(r => (
                      <div key={r.id} className="detail-review-item">
                        <div className="detail-review-header">
                          <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          <span className="detail-review-date">{new Date(r.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}</span>
                        </div>
                        {r.comment && <p className="detail-review-comment">{r.comment}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: price + contact */}
          <div className="detail-sidebar">
            <div className="price-card">
              <div className="price-tag">{formatPrice(listing.price, listing.type)}</div>
              <h1>{listing.title}</h1>
              <p className="detail-address">📍 {listing.address}, {listing.suburb} {listing.state} {listing.postcode}</p>

              <div className="listing-action-btns">
                {!isOwner && (
                  <button className="btn-contact" onClick={() => setShowContact(o => !o)}>
                    {showContact ? 'Hide contact' : 'Contact owner'}
                  </button>
                )}
                {listing.type === 'sale' && isLoggedIn() && !isOwner && (
                  <Link to={`/offers/${listing.id}`} className="btn-offer">Make an Offer</Link>
                )}
                {listing.type === 'rent' && isLoggedIn() && !isOwner && (
                  <Link to={`/apply/${listing.id}`} className="btn-apply">Apply to Rent</Link>
                )}
                <Link to={`/inspections/${listing.id}`} className="btn-inspect">Book Inspection</Link>
                {isOwner && (
                  <Link to={`/listing/${listing.id}/edit`} className="btn-edit-listing">Edit Listing</Link>
                )}
              </div>

              {showContact && (
                sent ? (
                  <p className="contact-sent">Message sent! Check your messages.</p>
                ) : (
                  <form className="contact-form" onSubmit={handleContact}>
                    <textarea rows={4} placeholder="Hi, I'm interested in this property…" value={message} onChange={e => setMessage(e.target.value)} required />
                    <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
                  </form>
                )
              )}

              <div className="seller-card">
                <div className="seller-avatar">{sellerInitial}</div>
                <div>
                  <div className="seller-name">
                    {listing.seller_name}
                    {listing.seller_verified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                  <div className="seller-since">Member since {sellerSince}</div>
                  {reviews.count > 0 && (
                    <div className="seller-rating">
                      <span className="stars-sm">{'★'.repeat(Math.round(reviews.avg_rating))}</span>
                      <span>{reviews.avg_rating} ({reviews.count})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-listing-meta">
                <div className="meta-row"><span>Type</span><span>{listing.type === 'sale' ? 'For Sale' : 'For Rent'}</span></div>
                <div className="meta-row"><span>Property</span><span style={{ textTransform: 'capitalize' }}>{listing.property_type}</span></div>
                <div className="meta-row"><span>Status</span><span style={{ textTransform: 'capitalize' }}>{listing.status?.replace('_', ' ')}</span></div>
                <div className="meta-row"><span>Views</span><span>{listing.views ?? 0}</span></div>
                <div className="meta-row"><span>Listed</span><span>{new Date(listing.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
