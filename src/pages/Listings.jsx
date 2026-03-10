import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './Listings.css'

const MOCK_LISTINGS = [
  { id: 1, type: 'sale', title: '4 Bed Family Home', suburb: 'Surry Hills', state: 'NSW', price: 1450000, beds: 4, baths: 2, cars: 2, size: 320, img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', tag: 'For Sale' },
  { id: 2, type: 'sale', title: 'Modern Townhouse', suburb: 'Fitzroy', state: 'VIC', price: 980000, beds: 3, baths: 2, cars: 1, size: 210, img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', tag: 'For Sale' },
  { id: 3, type: 'rent', title: 'City Apartment', suburb: 'CBD', state: 'VIC', price: 2800, beds: 2, baths: 1, cars: 1, size: 85, img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', tag: 'For Rent' },
  { id: 4, type: 'sale', title: 'Beachside Cottage', suburb: 'Manly', state: 'NSW', price: 2100000, beds: 3, baths: 2, cars: 2, size: 280, img: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=600&q=80', tag: 'For Sale' },
  { id: 5, type: 'rent', title: 'Stylish Studio', suburb: 'Newtown', state: 'NSW', price: 1600, beds: 1, baths: 1, cars: 0, size: 45, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', tag: 'For Rent' },
  { id: 6, type: 'sale', title: 'Heritage Queenslander', suburb: 'New Farm', state: 'QLD', price: 1750000, beds: 5, baths: 3, cars: 2, size: 560, img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', tag: 'For Sale' },
]

const PRICE_RANGES_SALE = ['Any', 'Under $500k', '$500k–$1M', '$1M–$1.5M', '$1.5M–$2M', '$2M+']
const PRICE_RANGES_RENT = ['Any', 'Under $1,500/mo', '$1,500–$2,500/mo', '$2,500–$4,000/mo', '$4,000+/mo']
const BED_OPTIONS = ['Any', '1+', '2+', '3+', '4+', '5+']

export default function Listings({ mode = 'sale' }) {
  const [searchParams] = useSearchParams()
  const [beds, setBeds] = useState('Any')
  const [priceRange, setPriceRange] = useState('Any')
  const [sort, setSort] = useState('newest')

  const filtered = MOCK_LISTINGS.filter(l => l.type === mode)

  const priceRanges = mode === 'sale' ? PRICE_RANGES_SALE : PRICE_RANGES_RENT

  const formatPrice = (p, type) =>
    type === 'rent'
      ? `$${p.toLocaleString()}/mo`
      : `$${(p / 1000000).toFixed(p >= 1000000 ? 2 : 0)}${p >= 1000000 ? 'M' : 'k'}`

  return (
    <div className="listings-page">
      <div className="listings-header">
        <div className="container">
          <h1>{mode === 'sale' ? 'Properties for Sale' : 'Properties for Rent'}</h1>
          <p>{filtered.length} properties found{searchParams.get('q') ? ` in "${searchParams.get('q')}"` : ''}</p>
        </div>
      </div>

      <div className="listings-body container">
        {/* Filters */}
        <aside className="filters">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Bedrooms</label>
            {BED_OPTIONS.map(b => (
              <button
                key={b}
                className={`filter-chip ${beds === b ? 'active' : ''}`}
                onClick={() => setBeds(b)}
              >{b}</button>
            ))}
          </div>

          <div className="filter-group">
            <label>Price range</label>
            <select value={priceRange} onChange={e => setPriceRange(e.target.value)}>
              {priceRanges.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Property type</label>
            {['Any', 'House', 'Apartment', 'Townhouse', 'Land'].map(t => (
              <button key={t} className="filter-chip">{t}</button>
            ))}
          </div>

          {mode === 'sale' && (
            <div className="filter-group">
              <label>Features</label>
              {['Pool', 'Garage', 'Air Con', 'Pets OK'].map(f => (
                <label key={f} className="filter-check">
                  <input type="checkbox" /> {f}
                </label>
              ))}
            </div>
          )}
        </aside>

        {/* Results */}
        <div className="listings-results">
          <div className="results-toolbar">
            <span>{filtered.length} results</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          <div className="listings-grid">
            {filtered.map(listing => (
              <Link to={`/listing/${listing.id}`} key={listing.id} className="listing-card">
                <div className="listing-img">
                  <img src={listing.img} alt={listing.title} />
                  <span className="listing-tag">{listing.tag}</span>
                </div>
                <div className="listing-info">
                  <div className="listing-price">
                    {formatPrice(listing.price, listing.type)}
                  </div>
                  <h3>{listing.title}</h3>
                  <p className="listing-address">{listing.suburb}, {listing.state}</p>
                  <div className="listing-features">
                    <span>🛏 {listing.beds}</span>
                    <span>🚿 {listing.baths}</span>
                    <span>🚗 {listing.cars}</span>
                    <span>📐 {listing.size}m²</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
