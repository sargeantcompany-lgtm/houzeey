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

  const formatPrice = (p, type) => {
    if (!p) return 'Contact agent'
    return type === 'rent' ? `$${Number(p).toLocaleString()}/wk` : `$${Number(p).toLocaleString()}`
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
            <Link to="/rent" className="btn-browse-outline">Browse rentals</Link>
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
                    <span className={`saved-badge ${l.type}`}>{l.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                  </div>
                  <div className="saved-card-body">
                    <div className="saved-price">{formatPrice(l.price, l.type)}</div>
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
