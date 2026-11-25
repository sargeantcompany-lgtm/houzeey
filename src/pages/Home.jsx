import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './Home.css'

const PROPERTY_TYPES = ['Any property type', 'House', 'Apartment', 'Townhouse', 'Unit', 'Land', 'Rural']

function formatPrice(listing) {
  if (listing.price_display === 'contact' || listing.price == null || Number(listing.price) === 0) return 'Price on request'
  if (listing.price_display === 'range' && listing.price_max) {
    return `$${Number(listing.price).toLocaleString('en-AU')} – $${Number(listing.price_max).toLocaleString('en-AU')}`
  }
  return `$${Number(listing.price).toLocaleString('en-AU')}`
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0])
  const [listings, setListings] = useState([])
  const [listingsError, setListingsError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.listings.list({ type: 'sale', sort: 'newest', limit: 3 })
      .then(data => setListings(data.listings || []))
      .catch(error => setListingsError(error.message || 'Could not load homes right now.'))
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (propertyType !== PROPERTY_TYPES[0]) params.set('property_type', propertyType.toLowerCase())
    navigate(`/buy${params.size ? `?${params}` : ''}`)
  }

  return (
    <div className="home home-new">
      <section className="home-hero">
        <div className="home-hero-photo" aria-hidden="true" />
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-content">
          <div className="home-eyebrow"><span /> Australia’s private property marketplace</div>
          <h1>Find a home.<br /><em>Deal direct.</em></h1>
          <p>Homes for sale by the people who own them. No agency listings, no commission.</p>

          <div className="home-search">
            <div className="home-search-tabs">
              <span className="home-search-tab active">Buy</span>
              <Link to="/sell" className="home-search-tab">Sell privately</Link>
            </div>
            <form className="home-search-form" onSubmit={handleSearch}>
              <label className="home-search-location">
                <span className="home-field-label">Location</span>
                <input
                  type="search"
                  placeholder="Suburb or postcode"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </label>
              <label className="home-search-type">
                <span className="home-field-label">Property type</span>
                <select value={propertyType} onChange={event => setPropertyType(event.target.value)}>
                  {PROPERTY_TYPES.map(type => <option key={type}>{type}</option>)}
                </select>
              </label>
              <button type="submit" className="home-search-button">
                <span aria-hidden="true">⌕</span> Search homes
              </button>
            </form>
            <div className="home-search-note"><span className="home-check">✓</span> Every new listing is reviewed by the seller’s solicitor or conveyancer before it goes live.</div>
          </div>
        </div>
        <div className="home-image-credit">Private homes. Real owners. A more direct way to move.</div>
      </section>

      <section className="home-trust-strip">
        <div className="home-trust-item"><span className="trust-icon">01</span><div><strong>Owner-listed only</strong><small>No real estate agency listings</small></div></div>
        <div className="home-trust-item"><span className="trust-icon">02</span><div><strong>Direct conversations</strong><small>Speak with the person selling</small></div></div>
        <div className="home-trust-item"><span className="trust-icon">03</span><div><strong>Legal review first</strong><small>Solicitor-attested listing details</small></div></div>
      </section>

      <section className="home-section home-featured">
        <div className="home-section-heading">
          <div>
            <span className="home-kicker">Listed by the owner</span>
            <h2>Find your place</h2>
            <p>Browse homes being sold directly by their owners across Australia.</p>
          </div>
          <Link className="home-text-link" to="/buy">Explore all homes <span aria-hidden="true">→</span></Link>
        </div>

        {listingsError ? (
          <div className="home-empty-featured home-featured-error">
            <div className="home-empty-icon">!</div>
            <div><strong>Homes could not be loaded.</strong><p>{listingsError}</p></div>
          </div>
        ) : listings.length ? (
          <div className="home-property-grid">
            {listings.map(listing => (
              <Link to={`/listing/${listing.id}`} className="home-property-card" key={listing.id}>
                <div className="home-property-image">
                  <img
                    src={listing.primary_image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=85'}
                    alt={listing.title}
                  />
                  <span className="home-owner-tag">Private sale</span>
                  <span className="home-property-save" aria-hidden="true">♡</span>
                </div>
                <div className="home-property-info">
                  <strong className="home-property-price">{formatPrice(listing)}</strong>
                  <h3>{listing.title}</h3>
                  <p>{listing.suburb}, {listing.state} {listing.postcode}</p>
                  <div className="home-property-meta">
                    {listing.beds != null && <span><b>{listing.beds}</b> bed</span>}
                    {listing.baths != null && <span><b>{listing.baths}</b> bath</span>}
                    {listing.cars != null && <span><b>{listing.cars}</b> car</span>}
                    {listing.land_size != null && <span><b>{Number(listing.land_size).toLocaleString()}</b> m²</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-empty-featured">
            <div className="home-empty-icon">⌂</div>
            <div><strong>Good homes start with good owners.</strong><p>Be among the first to list a home for sale by owner.</p></div>
            <Link to="/sell" className="home-empty-cta">Start a private listing <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </section>

      <section className="home-offers-section">
        <div className="home-offers-copy">
          <span className="home-kicker">Negotiate direct</span>
          <h2>Make an offer.<br /><em>Keep it all in one place.</em></h2>
          <p>Set out your price, deposit, settlement timing and conditions. Buyers and owners can respond or counter, with each step recorded in the offer history.</p>
        </div>
        <div className="home-offers-flow" aria-label="How offers work">
          <article><span>01</span><div><strong>Send your terms</strong><small>Make an offer from a property listing.</small></div></article>
          <article><span>02</span><div><strong>Respond or counter</strong><small>Keep the negotiation between buyer and owner.</small></div></article>
          <article><span>03</span><div><strong>Involve your conveyancer</strong><small>Ask your legal representative to prepare the contract.</small></div></article>
          <Link to="/buy" className="home-offers-link">Browse homes for sale <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="home-seller-section">
        <div className="home-seller-copy">
          <span className="home-kicker">A more considered way to sell</span>
          <h2>Your home.<br /><em>Your sale.</em></h2>
          <p>Sell directly to buyers and keep control of the process. Your solicitor or conveyancer reviews the key listing details before your property is published.</p>
          <Link to="/sell" className="home-seller-cta">See how private selling works <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-seller-steps">
          <article><span>01</span><div><h3>Prove who you are</h3><p>Complete identity checks and tell us how you’re authorised to sell.</p></div></article>
          <article><span>02</span><div><h3>Your solicitor reviews the details</h3><p>Invite your solicitor or conveyancer to review the property details before publication.</p></div></article>
          <article><span>03</span><div><h3>Connect directly</h3><p>Once the review is complete, buyers can contact you about the home.</p></div></article>
        </div>
      </section>

      <section className="home-bottom-cta">
        <div>
          <span className="home-kicker">For Australian homeowners</span>
          <h2>Ready to sell on your terms?</h2>
          <p>Create your listing and invite your legal representative to review it.</p>
        </div>
        <Link to="/sell" className="home-bottom-button">List your home <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  )
}
