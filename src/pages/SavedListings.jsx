import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './SavedListings.css'

export default function SavedListings() {
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.saved.list().then(setSaved).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleUnsave(listingId) {
    try {
      await api.saved.unsave(listingId)
      setSaved(prev => prev.filter(s => s.listing_id !== listingId && s.id !== listingId))
    } catch { /* ignore */ }
  }

  const formatPrice = listing => {
    if (listing.price_display === 'contact' || !listing.price || Number(listing.price) === 0) return 'Price on request'
    if (listing.price_display === 'range' && listing.price_max) {
      return `$${Number(listing.price).toLocaleString()} – $${Number(listing.price_max).toLocaleString()}`
    }
    return `$${Number(listing.price).toLocaleString()}`
  }

  return (
    <div className="saved-page">
      <div className="container">
        <div className="saved-header">
          <h1>Saved Properties</h1>
          <p>{saved.length} saved {saved.length === 1 ? 'property' : 'properties'}</p>
        </div>

        {loading ? (
          <div className="saved-loading">Loading…</div>
        ) : saved.length === 0 ? (
          <div className="saved-empty">
            <div className="saved-empty-icon">🏠</div>
            <h3>No saved properties yet</h3>
            <p>Heart a property while browsing to save it here.</p>
            <Link to="/buy" className="btn-browse">Browse properties for sale</Link>
          </div>
        ) : (
          <div className="saved-grid">
            {saved.map(item => {
              const l = item.listing || item
              return (
                <div key={l.listing_id || l.id} className="saved-card">
                  <div className="saved-card-img">
                    <img src={l.primary_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=70'} alt={l.title} />
                    <button className="saved-heart active" onClick={() => handleUnsave(l.listing_id || l.id)} title="Unsave">♥</button>
                    <span className="saved-badge sale">Private sale</span>
                  </div>
                  <div className="saved-card-body">
                    <div className="saved-price">{formatPrice(l)}</div>
                    <div className="saved-title">{l.title}</div>
                    <div className="saved-address">📍 {l.suburb}, {l.state}</div>
                    <div className="saved-stats">
                      {l.beds != null && <span>🛏 {l.beds}</span>}
                      {l.baths != null && <span>🚿 {l.baths}</span>}
                      {l.cars != null && <span>🚗 {l.cars}</span>}
                    </div>
                    <Link to={`/listing/${l.listing_id || l.id}`} className="saved-view-btn">View property</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
