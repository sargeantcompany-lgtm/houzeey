import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import './ListingDetail.css'

const MOCK = {
  1: {
    id: 1,
    title: '4 Bed Family Home',
    address: '12 Maple Street, Surry Hills NSW 2010',
    price: 1450000,
    type: 'sale',
    beds: 4, baths: 2, cars: 2, size: 320,
    description: `This stunning family home offers the perfect blend of space, style and comfort in one of Sydney's most sought-after suburbs.\n\nFeaturing generous living areas, a modern kitchen with stone benchtops, and a landscaped rear garden — this property is ideal for families who want it all.\n\nThe upper level hosts all four bedrooms including a master with walk-in robe and ensuite, while the ground floor offers open-plan living and dining that flows to the outdoor entertaining area.`,
    features: ['Ducted air conditioning', 'Alarm system', 'Built-in wardrobes', 'Outdoor entertaining', 'Double garage', 'Rainwater tank'],
    imgs: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
    ],
    seller: { name: 'Michael Chen', joined: 'Jan 2024', verified: true },
    inspections: ['Sat 15 Mar, 10:00am – 10:30am', 'Sun 16 Mar, 1:00pm – 1:30pm'],
  },
}

export default function ListingDetail() {
  const { id } = useParams()
  const listing = MOCK[id] || MOCK[1]
  const [activeImg, setActiveImg] = useState(0)
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')

  const formatPrice = p => `$${p.toLocaleString()}`

  return (
    <div className="detail-page">
      <div className="container">

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link> › <Link to="/buy">Buy</Link> › <span>{listing.title}</span>
        </nav>

        <div className="detail-grid">
          {/* Left: images + info */}
          <div className="detail-main">
            {/* Gallery */}
            <div className="gallery">
              <div className="gallery-main">
                <img src={listing.imgs[activeImg]} alt={listing.title} />
              </div>
              <div className="gallery-thumbs">
                {listing.imgs.map((img, i) => (
                  <button
                    key={i}
                    className={`thumb ${activeImg === i ? 'active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="detail-stats">
              <div className="stat"><span className="stat-val">{listing.beds}</span><span>Beds</span></div>
              <div className="stat"><span className="stat-val">{listing.baths}</span><span>Baths</span></div>
              <div className="stat"><span className="stat-val">{listing.cars}</span><span>Cars</span></div>
              <div className="stat"><span className="stat-val">{listing.size}m²</span><span>Land</span></div>
            </div>

            {/* Description */}
            <div className="detail-section">
              <h2>About this property</h2>
              {listing.description.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Features */}
            <div className="detail-section">
              <h2>Features</h2>
              <ul className="features-list">
                {listing.features.map(f => <li key={f}>✓ {f}</li>)}
              </ul>
            </div>

            {/* Inspections */}
            <div className="detail-section">
              <h2>Open for inspection</h2>
              <div className="inspections">
                {listing.inspections.map(t => (
                  <div key={t} className="inspection-slot">
                    <span>📅 {t}</span>
                    <button className="btn-register">Register</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: price + contact */}
          <div className="detail-sidebar">
            <div className="price-card">
              <div className="price-tag">
                {listing.type === 'sale' ? formatPrice(listing.price) : `${formatPrice(listing.price)}/mo`}
              </div>
              <h1>{listing.title}</h1>
              <p className="detail-address">📍 {listing.address}</p>

              <button className="btn-contact" onClick={() => setShowContact(o => !o)}>
                {showContact ? 'Hide contact form' : 'Contact seller'}
              </button>

              {showContact && (
                <form className="contact-form" onSubmit={e => { e.preventDefault(); alert('Message sent!') }}>
                  <textarea
                    rows={4}
                    placeholder="Hi, I'm interested in this property..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                  <button type="submit">Send message</button>
                </form>
              )}

              <div className="seller-card">
                <div className="seller-avatar">{listing.seller.name[0]}</div>
                <div>
                  <div className="seller-name">
                    {listing.seller.name}
                    {listing.seller.verified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                  <div className="seller-since">Member since {listing.seller.joined}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
