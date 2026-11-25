import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { isLoggedIn } from '../auth'
import './Listings.css'

const PROPERTY_TYPES = ['Any property type', 'House', 'Apartment', 'Townhouse', 'Unit', 'Land', 'Rural']
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const MIN_OPTIONS = ['Any', '1+', '2+', '3+', '4+', '5+']
const PAGE_SIZE = 12

function formatPrice(listing) {
  if (listing.price_display === 'contact' || listing.price == null || Number(listing.price) === 0) return 'Price on request'
  if (listing.price_display === 'range' && listing.price_max) {
    return `$${Number(listing.price).toLocaleString('en-AU')} – $${Number(listing.price_max).toLocaleString('en-AU')}`
  }
  return `$${Number(listing.price).toLocaleString('en-AU')}`
}

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(new Set())
  const [listingError, setListingError] = useState('')
  const navigate = useNavigate()
  const offsetValue = Number(searchParams.get('offset') || 0)
  const offset = Number.isSafeInteger(offsetValue) && offsetValue > 0 ? offsetValue : 0
  const sortValue = searchParams.get('sort')
  const sort = ['price-asc', 'price-desc'].includes(sortValue) ? sortValue : 'newest'

  useEffect(() => {
    if (!isLoggedIn()) return
    api.saved.list()
      .then(data => setSaved(new Set(data.map(listing => listing.id))))
      .catch(() => setSaved(new Set()))
  }, [])

  useEffect(() => {
    const params = {
      type: 'sale',
      suburb: searchParams.get('q') || '',
      state: searchParams.get('state') || '',
      beds: searchParams.get('beds') || '',
      baths: searchParams.get('baths') || '',
      cars: searchParams.get('cars') || '',
      min_price: searchParams.get('min_price') || '',
      max_price: searchParams.get('max_price') || '',
      min_land_size: searchParams.get('min_land_size') || '',
      max_land_size: searchParams.get('max_land_size') || '',
      property_type: searchParams.get('property_type') || '',
      sort: sort === 'price-asc' ? 'price_asc' : sort === 'price-desc' ? 'price_desc' : 'newest',
      limit: PAGE_SIZE,
      offset,
    }

    api.listings.list(params)
      .then(data => { setListings(data.listings || []); setTotal(data.total || 0); setListingError('') })
      .catch(error => { setListings([]); setTotal(0); setListingError(error.message || 'Could not load homes right now.') })
      .finally(() => setLoading(false))
  }, [offset, searchParams, sort])

  function submitFilters(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    if (searchParams.get('sort')) next.set('sort', searchParams.get('sort'))
    for (const key of ['q', 'state', 'property_type', 'beds', 'baths', 'cars', 'min_price', 'max_price', 'min_land_size', 'max_land_size']) {
      const value = String(formData.get(key) || '').trim()
      if (value && value !== 'Any' && value !== 'Any property type') next.set(key, value)
    }
    if (next.toString() === searchParams.toString()) return
    setLoading(true)
    setSearchParams(next)
  }

  function updateSearchParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (key !== 'offset') next.delete('offset')
    if (value) next.set(key, value)
    else next.delete(key)
    setLoading(true)
    setSearchParams(next)
  }

  function clearFilters() {
    if (!searchParams.toString()) return
    setLoading(true)
    setSearchParams(new URLSearchParams())
  }

  async function toggleSave(event, id) {
    event.preventDefault()
    event.stopPropagation()
    if (!isLoggedIn()) {
      navigate('/login', { state: { from: { pathname: '/buy' } } })
      return
    }

    const wasSaved = saved.has(id)
    setSaved(current => {
      const next = new Set(current)
      wasSaved ? next.delete(id) : next.add(id)
      return next
    })
    try {
      if (wasSaved) await api.saved.unsave(id)
      else await api.saved.save(id)
    } catch (error) {
      setSaved(current => {
        const next = new Set(current)
        wasSaved ? next.add(id) : next.delete(id)
        return next
      })
      setListingError(error.message || 'Could not update saved homes.')
    }
  }

  return (
    <div className="listings-page">
      <div className="listings-header">
        <div className="container listings-header-inner">
          <div>
            <span className="listings-kicker">Private homes, listed by owners</span>
            <h1>Homes for sale</h1>
            <p>{loading ? 'Finding homes…' : `${total.toLocaleString()} owner-listed homes${searchParams.get('q') ? ` near "${searchParams.get('q')}"` : ' across Australia'}`}</p>
          </div>
          <Link to="/sell" className="listings-sell-link">Sell your home <span aria-hidden="true">→</span></Link>
        </div>
      </div>

      <div className="listings-body container">
        <aside className="filters">
          <div className="filters-title-row">
            <h3>Refine your search</h3>
            <span>FOR SALE BY OWNER</span>
          </div>

          <form key={searchParams.toString()} className="listing-filters-form" onSubmit={submitFilters}>
            <div className="filter-location">
              <label htmlFor="listing-location">Location</label>
              <div className="filter-location-row">
                <input id="listing-location" name="q" type="search" defaultValue={searchParams.get('q') || ''} placeholder="Suburb or postcode" />
                <button type="submit" aria-label="Apply search filters">⌕</button>
              </div>
            </div>

            <div className="filter-group filter-select-group">
              <label htmlFor="filter-state">State or territory</label>
              <select id="filter-state" name="state" defaultValue={searchParams.get('state') || ''}>
                <option value="">All Australia</option>
                {STATES.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-property-type">Property type</label>
              <select id="filter-property-type" name="property_type" defaultValue={searchParams.get('property_type') || ''}>
                <option value="">Any property type</option>
                {PROPERTY_TYPES.slice(1).map(type => <option key={type} value={type.toLowerCase()}>{type}</option>)}
              </select>
            </div>

            {[
              ['beds', 'Bedrooms'],
              ['baths', 'Bathrooms'],
              ['cars', 'Car spaces'],
            ].map(([name, label]) => (
              <div className="filter-group filter-select-group" key={name}>
                <label htmlFor={`filter-${name}`}>{label}</label>
                <select id={`filter-${name}`} name={name} defaultValue={searchParams.get(name) || ''}>
                  <option value="">Any</option>
                  {MIN_OPTIONS.slice(1).map(option => <option key={option} value={option.replace('+', '')}>{option}</option>)}
                </select>
              </div>
            ))}

            <div className="filter-group">
              <label>Price range</label>
              <div className="filter-price-inputs">
                <label htmlFor="filter-min-price">Min price</label>
                <input id="filter-min-price" name="min_price" type="number" min="0" step="10000" placeholder="No min" defaultValue={searchParams.get('min_price') || ''} />
                <label htmlFor="filter-max-price">Max price</label>
                <input id="filter-max-price" name="max_price" type="number" min="0" step="10000" placeholder="No max" defaultValue={searchParams.get('max_price') || ''} />
              </div>
            </div>

            <div className="filter-group">
              <label>Land size (m²)</label>
              <div className="filter-price-inputs">
                <label htmlFor="filter-min-land">Min size</label>
                <input id="filter-min-land" name="min_land_size" type="number" min="0" step="10" placeholder="No min" defaultValue={searchParams.get('min_land_size') || ''} />
                <label htmlFor="filter-max-land">Max size</label>
                <input id="filter-max-land" name="max_land_size" type="number" min="0" step="10" placeholder="No max" defaultValue={searchParams.get('max_land_size') || ''} />
              </div>
            </div>

            <div className="filter-actions">
              <button type="submit" className="filter-apply">Show homes</button>
              <button type="button" className="filter-clear" onClick={clearFilters}>Clear filters</button>
            </div>

            <div className="filter-owner-note">
              <span aria-hidden="true">✓</span>
              <p>New listings are held for solicitor or conveyancer review before publication.</p>
            </div>
          </form>
        </aside>

        <div className="listings-results">
          <div className="results-toolbar">
            <span>{loading ? 'Finding homes…' : total ? `Showing ${offset + 1}–${Math.min(offset + listings.length, total)} of ${total.toLocaleString()} homes` : '0 homes'}</span>
            <select value={sort} onChange={event => updateSearchParam('sort', event.target.value)} aria-label="Sort homes">
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          {loading ? (
            <div className="listings-loading">Finding homes listed by private owners…</div>
          ) : listings.length === 0 ? (
            <div className="listings-empty">
              <span className="listings-empty-icon">⌂</span>
              <h2>{listingError ? 'Homes could not be loaded' : 'No homes found just yet'}</h2>
              <p>{listingError || 'Try a wider search, or be among the first homeowners to list privately.'}</p>
              <Link to="/sell" className="listings-empty-cta">List your home <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <div className="listings-grid">
              {listingError && <p className="listings-error" role="alert">{listingError}</p>}
              {listings.map(listing => (
                <article key={listing.id} className="listing-card">
                  <div className="listing-img">
                    <Link to={`/listing/${listing.id}`}>
                      <img src={listing.primary_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=85'} alt={listing.title} />
                    </Link>
                    <span className="listing-tag">Private sale</span>
                    <button className={`listing-save ${saved.has(listing.id) ? 'saved' : ''}`} type="button" aria-label={saved.has(listing.id) ? 'Remove from saved homes' : 'Save home'} onClick={event => toggleSave(event, listing.id)}>
                      {saved.has(listing.id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <Link to={`/listing/${listing.id}`} className="listing-info">
                    <div className="listing-price">{formatPrice(listing)}</div>
                    <h3>{listing.title}</h3>
                    <p className="listing-address">{listing.suburb}, {listing.state} {listing.postcode}</p>
                    <div className="listing-features">
                      {listing.beds != null && <span><b>{listing.beds}</b> bed</span>}
                      {listing.baths != null && <span><b>{listing.baths}</b> bath</span>}
                      {listing.cars != null && <span><b>{listing.cars}</b> car</span>}
                      {listing.land_size != null && <span><b>{Number(listing.land_size).toLocaleString()}</b> m²</span>}
                    </div>
                    {listing.solicitor_review_status === 'approved' && (
                      <div className="listing-review-status"><span>✓</span> Solicitor-reviewed details</div>
                    )}
                  </Link>
                </article>
              ))}
            </div>
          )}

          {!loading && total > PAGE_SIZE && (
            <nav className="listings-pagination" aria-label="Property results pages">
              <button type="button" disabled={offset === 0} onClick={() => updateSearchParam('offset', String(Math.max(0, offset - PAGE_SIZE)))}>
                Previous
              </button>
              <span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
              <button type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => updateSearchParam('offset', String(offset + PAGE_SIZE))}>
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
