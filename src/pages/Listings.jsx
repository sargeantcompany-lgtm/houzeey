import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import './Listings.css'

const PRICE_RANGES_SALE = ['Any', 'Under $500k', '$500k–$1M', '$1M–$1.5M', '$1.5M–$2M', '$2M+']
const PRICE_RANGES_RENT = ['Any', 'Under $1,500/mo', '$1,500–$2,500/mo', '$2,500–$4,000/mo', '$4,000+/mo']
const BED_OPTIONS = ['Any', '1+', '2+', '3+', '4+', '5+']

const SALE_RANGES = [null, [0, 500000], [500000, 1000000], [1000000, 1500000], [1500000, 2000000], [2000000, null]]
const RENT_RANGES = [null, [0, 1500], [1500, 2500], [2500, 4000], [4000, null]]

function formatPrice(p, type) {
  if (p == null) return 'Contact agent'
  return type === 'rent'
    ? `$${Number(p).toLocaleString()}/mo`
    : `$${(p / 1000000).toFixed(p >= 1000000 ? 2 : 0)}${p >= 1000000 ? 'M' : 'k'}`
}

export default function Listings({ mode = 'sale' }) {
  const [searchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [beds, setBeds] = useState('Any')
  const [priceRange, setPriceRange] = useState('Any')
  const [propertyType, setPropertyType] = useState('Any')
  const [sort, setSort] = useState('newest')

  const priceRanges = mode === 'sale' ? PRICE_RANGES_SALE : PRICE_RANGES_RENT
  const rangeMap = mode === 'sale' ? SALE_RANGES : RENT_RANGES

  useEffect(() => {
    setLoading(true)
    const rangeIdx = priceRanges.indexOf(priceRange)
    const range = rangeMap[rangeIdx] || null

    const params = {
      type: mode === 'sale' ? 'sale' : 'rent',
      suburb: searchParams.get('q') || '',
      beds: beds !== 'Any' ? beds.replace('+', '') : '',
      min_price: range?.[0] || '',
      max_price: range?.[1] || '',
      property_type: propertyType !== 'Any' ? propertyType.toLowerCase() : '',
      sort: sort === 'newest' ? 'newest' : sort === 'price-asc' ? 'price_asc' : 'price_desc',
    }

    api.listings.list(params)
      .then(data => { setListings(data.listings); setTotal(data.total) })
      .catch(() => { setListings([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [mode, beds, priceRange, propertyType, sort, searchParams])

  return (
    <div className="listings-page">
      <div className="listings-header">
        <div className="container">
          <h1>{mode === 'sale' ? 'Properties for Sale' : 'Properties for Rent'}</h1>
          <p>{loading ? 'Loading…' : `${total} properties found${searchParams.get('q') ? ` in "${searchParams.get('q')}"` : ''}`}</p>
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
              <button
                key={t}
                className={`filter-chip ${propertyType === t ? 'active' : ''}`}
                onClick={() => setPropertyType(t)}
              >{t}</button>
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
            <span>{total} results</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          {loading ? (
            <div className="listings-loading">Loading properties…</div>
          ) : listings.length === 0 ? (
            <div className="listings-empty">
              <p>No properties found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map(listing => (
                <Link to={`/listing/${listing.id}`} key={listing.id} className="listing-card">
                  <div className="listing-img">
                    <img
                      src={listing.primary_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80'}
                      alt={listing.title}
                    />
                    <span className="listing-tag">{listing.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                  </div>
                  <div className="listing-info">
                    <div className="listing-price">
                      {formatPrice(listing.price, listing.type)}
                    </div>
                    <h3>{listing.title}</h3>
                    <p className="listing-address">{listing.suburb}, {listing.state}</p>
                    <div className="listing-features">
                      {listing.beds != null && <span>🛏 {listing.beds}</span>}
                      {listing.baths != null && <span>🚿 {listing.baths}</span>}
                      {listing.cars != null && <span>🚗 {listing.cars}</span>}
                      {listing.land_size != null && <span>📐 {listing.land_size}m²</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
