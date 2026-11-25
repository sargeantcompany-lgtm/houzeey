import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Icon, ListingCard, STATES, money, toggleSave, useSaved } from '../craft/ui'

const PRICES = [200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1250000, 1500000, 2000000, 3000000, 5000000]
const PAGE = 12

export default function Listings() {
  const navigate = useNavigate()
  const saved = useSaved()
  const [params, setParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const q = params.get('q') || ''
  const state = params.get('state') || ''
  const sort = params.get('sort') || 'newest'

  function apiParams(offset = 0) {
    const p = { type: 'sale', sort, limit: PAGE, offset }
    const query = q.trim()
    const asState = STATES.find(s => s.code === query.toUpperCase())
    if (asState) p.state = asState.code
    else if (query) p.suburb = query
    if (state) p.state = state
    for (const key of ['property_type', 'beds', 'min_price', 'max_price']) if (params.get(key)) p[key] = params.get(key)
    return p
  }

  useEffect(() => {
    let live = true
    setLoading(true); setError('')
    api.listings.list(apiParams())
      .then(d => { if (live) { setListings(d.listings); setTotal(d.total) } })
      .catch(e => { if (live) { setListings([]); setTotal(0); setError(e.message || 'Could not load homes right now.') } })
      .finally(() => live && setLoading(false))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const d = await api.listings.list(apiParams(listings.length))
      setListings(l => [...l, ...d.listings])
    } finally { setLoadingMore(false) }
  }

  function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = new URLSearchParams()
    for (const key of ['q', 'property_type', 'min_price', 'max_price', 'beds']) {
      const v = String(f.get(key) || '').trim()
      if (v) next.set(key, v)
    }
    if (state && !next.get('q')) next.set('state', state)
    if (sort !== 'newest') next.set('sort', sort)
    setShowMore(false)
    setParams(next)
  }

  function setSort(value) {
    const next = new URLSearchParams(params)
    if (value === 'newest') next.delete('sort'); else next.set('sort', value)
    setParams(next)
  }

  const stateName = STATES.find(s => s.code === (state || q.toUpperCase()))?.name
  const where = stateName || q
  const title = where ? `Homes for sale in ${where}` : 'Properties for sale by owner'

  return (
    <>
      <section className="search-top">
        <div className="container">
          <form key={params.toString()} className={`filters ${showMore ? 'show-more' : ''}`} role="search" autoComplete="off" onSubmit={submit}>
            <div className="search-input-wrap filters-query">
              <Icon.search />
              <input name="q" type="search" defaultValue={q} placeholder="Suburb, postcode or state" aria-label="Suburb, postcode or state" />
            </div>
            <button type="button" className="btn btn-outline filters-toggle" aria-expanded={showMore} aria-controls="filterMore" onClick={() => setShowMore(s => !s)}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Filters
            </button>
            <div className="filter-more" id="filterMore">
              <label className="field field-inline"><span>Type</span>
                <select name="property_type" defaultValue={params.get('property_type') || ''}>
                  <option value="">All types</option><option value="house">House</option><option value="apartment">Apartment</option>
                  <option value="townhouse">Townhouse</option><option value="unit">Unit</option><option value="land">Land</option><option value="rural">Rural</option>
                </select>
              </label>
              <label className="field field-inline"><span>Min price</span>
                <select name="min_price" defaultValue={params.get('min_price') || ''}><option value="">Any</option>{PRICES.map(p => <option key={p} value={p}>{money(p)}</option>)}</select>
              </label>
              <label className="field field-inline"><span>Max price</span>
                <select name="max_price" defaultValue={params.get('max_price') || ''}><option value="">Any</option>{PRICES.map(p => <option key={p} value={p}>{money(p)}</option>)}</select>
              </label>
              <label className="field field-inline"><span>Bedrooms</span>
                <select name="beds" defaultValue={params.get('beds') || ''}><option value="">Any</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}</select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="results">
        <div className="container">
          <div className="results-head">
            <div>
              <h1>{title}</h1>
              <p className="muted">{loading ? 'Finding homes…' : `${total.toLocaleString('en-AU')} ${total === 1 ? 'property' : 'properties'}${where ? '' : ' across Australia'}`}</p>
            </div>
            <label className="field field-inline sort"><span>Sort</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price (low to high)</option>
                <option value="price_desc">Price (high to low)</option>
              </select>
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="result-grid">
            {listings.map(l => <ListingCard key={l.id} listing={l} saved={saved.has(l.id)} onToggleSave={id => toggleSave(id, navigate)} />)}
          </div>
          {!loading && !listings.length && !error && (
            <div className="empty">
              <h2>No properties match</h2>
              <p>Try a nearby suburb, a wider price range or fewer filters.</p>
              <Link className="btn btn-outline" to="/buy">Clear search</Link>
            </div>
          )}
          {listings.length < total && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Show more homes'}</button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
