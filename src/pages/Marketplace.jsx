import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { isLoggedIn } from '../auth'
import './Marketplace.css'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80'
const STATES = ['All', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const PROP_TYPES = ['All', 'House', 'Apartment', 'Townhouse', 'Land']
const BED_OPTIONS = ['Any', '1+', '2+', '3+', '4+']

function formatPrice(p, type) {
  if (p == null) return 'Contact agent'
  return type === 'rent'
    ? `$${Number(p).toLocaleString()}/mo`
    : Number(p) >= 1000000 ? `$${(p / 1000000).toFixed(2)}M` : `$${(p / 1000).toFixed(0)}k`
}

export default function Marketplace() {
  const [viewMode, setViewMode] = useState('grid')
  const [listingType, setListingType] = useState('all')
  const [stateFilter, setStateFilter] = useState('All')
  const [propType, setPropType] = useState('All')
  const [beds, setBeds] = useState('Any')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(new Set())

  // Load listings
  useEffect(() => {
    setLoading(true)
    const params = {
      type: listingType !== 'all' ? listingType : '',
      state: stateFilter !== 'All' ? stateFilter : '',
      property_type: propType !== 'All' ? propType.toLowerCase() : '',
      beds: beds !== 'Any' ? beds.replace('+', '') : '',
    }
    api.listings.list(params)
      .then(data => setListings(data.listings))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [listingType, stateFilter, propType, beds])

  // Load saved listings if logged in
  useEffect(() => {
    if (!isLoggedIn()) return
    api.saved.list()
      .then(data => setSaved(new Set(data.map(l => l.id))))
      .catch(() => {})
  }, [])

  async function toggleSave(id) {
    if (!isLoggedIn()) return
    const isSaved = saved.has(id)
    setSaved(s => {
      const next = new Set(s)
      isSaved ? next.delete(id) : next.add(id)
      return next
    })
    try {
      isSaved ? await api.saved.unsave(id) : await api.saved.save(id)
    } catch {
      // Revert on error
      setSaved(s => {
        const next = new Set(s)
        isSaved ? next.add(id) : next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="mp-page">
      <div className="mp-header">
        <div className="container">
          <div className="mp-header-row">
            <div>
              <h1>Find your property</h1>
              <p>{loading ? 'Loading…' : `${listings.length} properties available`}</p>
            </div>
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                ⊞ Browse
              </button>
              <button className={viewMode === 'swipe' ? 'active' : ''} onClick={() => setViewMode('swipe')}>
                ◈ Swipe
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-body container">
        <div className="mp-filters">
          <div className="filter-pill-group">
            {[['all','All'], ['sale','For Sale'], ['rent','For Rent']].map(([val, label]) => (
              <button key={val} className={`pill ${listingType === val ? 'active' : ''}`} onClick={() => setListingType(val)}>{label}</button>
            ))}
          </div>
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={propType} onChange={e => setPropType(e.target.value)}>
            {PROP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={beds} onChange={e => setBeds(e.target.value)}>
            {BED_OPTIONS.map(b => <option key={b} value={b}>{b === 'Any' ? 'Any beds' : b + ' beds'}</option>)}
          </select>
          {saved.size > 0 && <span className="saved-count">❤ {saved.size} saved</span>}
        </div>

        {loading ? (
          <div className="mp-loading">Loading properties…</div>
        ) : viewMode === 'grid' ? (
          <div className="mp-grid">
            {listings.length === 0 ? (
              <div className="no-results">No properties match your filters.</div>
            ) : listings.map(p => (
              <div key={p.id} className="mp-card">
                <Link to={`/listing/${p.id}`} className="mp-card-img">
                  <img src={p.primary_image || PLACEHOLDER} alt={p.title} />
                  <span className={`mp-badge ${p.type}`}>{p.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                  <button
                    className={`save-btn ${saved.has(p.id) ? 'saved' : ''}`}
                    onClick={e => { e.preventDefault(); toggleSave(p.id) }}
                  >{saved.has(p.id) ? '❤' : '♡'}</button>
                </Link>
                <div className="mp-card-info">
                  <div className="mp-price">{formatPrice(p.price, p.type)}</div>
                  <h3>{p.title}</h3>
                  <p className="mp-location">📍 {p.suburb}, {p.state} {p.postcode}</p>
                  <div className="mp-stats">
                    {p.beds != null && <span>🛏 {p.beds}</span>}
                    {p.baths != null && <span>🚿 {p.baths}</span>}
                    {p.cars != null && <span>🚗 {p.cars}</span>}
                    {p.land_size != null && <span>📐 {p.land_size}m²</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SwipeDeck
            properties={listings}
            saved={saved}
            onSave={toggleSave}
          />
        )}
      </div>
    </div>
  )
}

function SwipeDeck({ properties, saved, onSave }) {
  const [index, setIndex] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [decision, setDecision] = useState(null)
  const [history, setHistory] = useState([])
  const dragStart = useRef(null)

  const current = properties[index]

  function getPos(e) {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY }
  }

  function onDragStart(e) {
    dragStart.current = getPos(e)
    setDragging(true)
  }

  function onDragMove(e) {
    if (!dragStart.current) return
    const pos = getPos(e)
    const dx = pos.x - dragStart.current.x
    const dy = pos.y - dragStart.current.y
    setOffset({ x: dx, y: dy })
    setDecision(dx > 50 ? 'like' : dx < -50 ? 'skip' : null)
  }

  function onDragEnd() {
    if (Math.abs(offset.x) > 100) {
      commit(offset.x > 0)
    } else {
      setOffset({ x: 0, y: 0 })
      setDecision(null)
    }
    dragStart.current = null
    setDragging(false)
  }

  function commit(liked) {
    if (liked) onSave(current.id)
    setHistory(h => [...h, index])
    setOffset({ x: 0, y: 0 })
    setDecision(null)
    setIndex(i => i + 1)
  }

  function undo() {
    if (!history.length) return
    setIndex(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
  }

  if (!current) {
    return (
      <div className="swipe-done">
        <span>🏠</span>
        <h3>You've seen all {properties.length} properties!</h3>
        <p>{saved.size} saved to your favourites.</p>
        <button onClick={() => { setIndex(0); setHistory([]) }} className="btn-reset">See again</button>
      </div>
    )
  }

  const rotate = offset.x / 18
  const cardStyle = dragging
    ? { transform: `translate(${offset.x}px, ${offset.y * 0.3}px) rotate(${rotate}deg)`, transition: 'none', cursor: 'grabbing' }
    : { transform: 'translate(0,0) rotate(0deg)', transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1)', cursor: 'grab' }

  const nextProp = properties[index + 1]

  return (
    <div className="swipe-deck">
      <div className="swipe-progress">
        <span>{index + 1} of {properties.length}</span>
        {saved.size > 0 && <span className="swipe-saved-count">❤ {saved.size} saved</span>}
      </div>

      <div className="swipe-stage">
        {nextProp && (
          <div className="swipe-card swipe-card-behind">
            <img src={nextProp.primary_image || PLACEHOLDER} alt="" draggable={false} />
          </div>
        )}

        <div
          className="swipe-card swipe-card-front"
          style={cardStyle}
          onMouseDown={onDragStart}
          onMouseMove={dragging ? onDragMove : undefined}
          onMouseUp={onDragEnd}
          onMouseLeave={dragging ? onDragEnd : undefined}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="swipe-img">
            <img src={current.primary_image || PLACEHOLDER} alt={current.title} draggable={false} />
            <span className={`mp-badge ${current.type}`}>{current.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
            {decision === 'like' && <div className="swipe-overlay like">❤ Save</div>}
            {decision === 'skip' && <div className="swipe-overlay skip">✕ Skip</div>}
          </div>
          <div className="swipe-info">
            <div className="swipe-price">{formatPrice(current.price, current.type)}</div>
            <h3>{current.title}</h3>
            <p>📍 {current.suburb}, {current.state} {current.postcode}</p>
            <div className="mp-stats">
              {current.beds != null && <span>🛏 {current.beds}</span>}
              {current.baths != null && <span>🚿 {current.baths}</span>}
              {current.cars != null && <span>🚗 {current.cars}</span>}
              {current.land_size != null && <span>📐 {current.land_size}m²</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="swipe-actions">
        <button className="swipe-btn undo-btn" onClick={undo} disabled={!history.length} title="Undo">↩</button>
        <button className="swipe-btn skip-btn" onClick={() => commit(false)} title="Skip">✕</button>
        <button className="swipe-btn like-btn" onClick={() => commit(true)} title="Save">❤</button>
        <Link to={`/listing/${current.id}`} className="swipe-btn info-btn" title="View details">ℹ</Link>
      </div>

      <p className="swipe-hint">Drag left to skip · Drag right to save</p>
    </div>
  )
}
