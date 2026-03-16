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

  useEffect(() => {
    api.listings.get(id)
      .then(data => setListing(data))
      .catch(() => setError('Property not found'))
      .finally(() => setLoading(false))
  }, [id])

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
      await api.conversations.start({
        recipient_id: listing.user_id,
        listing_id: listing.id,
        message,
      })
      setSent(true)
      setMessage('')
    } catch (err) {
      alert(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatPrice = (p, type) => {
    if (p == null) return 'Contact agent'
    return type === 'rent'
      ? `$${Number(p).toLocaleString()}/mo`
      : `$${Number(p).toLocaleString()}`
  }

  if (loading) return <div className="detail-page"><div className="container"><p>Loading…</p></div></div>
  if (error || !listing) return <div className="detail-page"><div className="container"><p>{error || 'Not found'}</p></div></div>

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
              </div>
              {imgs.length > 1 && (
                <div className="gallery-thumbs">
                  {imgs.map((img, i) => (
                    <button
                      key={i}
                      className={`thumb ${activeImg === i ? 'active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
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

            {listing.description && (
              <div className="detail-section">
                <h2>About this property</h2>
                {listing.description.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
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
                <button className="btn-contact" onClick={() => setShowContact(o => !o)}>
                  {showContact ? 'Hide contact' : 'Contact owner'}
                </button>
                {listing.type === 'sale' && isLoggedIn() && getSession()?.id !== listing.user_id && (
                  <Link to={`/offers/${listing.id}`} className="btn-offer">Make an Offer</Link>
                )}
                {listing.type === 'rent' && isLoggedIn() && getSession()?.id !== listing.user_id && (
                  <Link to={`/apply/${listing.id}`} className="btn-apply">Apply to Rent</Link>
                )}
                <Link to={`/inspections/${listing.id}`} className="btn-inspect">Book Inspection</Link>
              </div>

              {showContact && (
                sent ? (
                  <p className="contact-sent">Message sent! Check your messages.</p>
                ) : (
                  <form className="contact-form" onSubmit={handleContact}>
                    <textarea
                      rows={4}
                      placeholder="Hi, I'm interested in this property…"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={sending}>
                      {sending ? 'Sending…' : 'Send message'}
                    </button>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
