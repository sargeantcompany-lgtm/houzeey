import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Marketplace.css'

const PROPERTIES = [
  { id: 1, type: 'sale', title: '4 Bed Family Home', suburb: 'Surry Hills', state: 'NSW', postcode: '2010', price: 1450000, beds: 4, baths: 2, cars: 2, size: 320, propertyType: 'House', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80' },
  { id: 2, type: 'sale', title: 'Modern Townhouse', suburb: 'Fitzroy', state: 'VIC', postcode: '3065', price: 980000, beds: 3, baths: 2, cars: 1, size: 210, propertyType: 'Townhouse', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&q=80' },
  { id: 3, type: 'rent', title: 'City Apartment', suburb: 'Melbourne CBD', state: 'VIC', postcode: '3000', price: 2800, beds: 2, baths: 1, cars: 1, size: 85, propertyType: 'Apartment', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=700&q=80' },
  { id: 4, type: 'sale', title: 'Beachside Cottage', suburb: 'Manly', state: 'NSW', postcode: '2095', price: 2100000, beds: 3, baths: 2, cars: 2, size: 280, propertyType: 'House', img: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=700&q=80' },
  { id: 5, type: 'rent', title: 'Stylish Studio', suburb: 'Newtown', state: 'NSW', postcode: '2042', price: 1600, beds: 1, baths: 1, cars: 0, size: 45, propertyType: 'Apartment', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=700&q=80' },
  { id: 6, type: 'sale', title: 'Heritage Queenslander', suburb: 'New Farm', state: 'QLD', postcode: '4005', price: 1750000, beds: 5, baths: 3, cars: 2, size: 560, propertyType: 'House', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80' },
  { id: 7, type: 'rent', title: 'Garden Terrace', suburb: 'Paddington', state: 'NSW', postcode: '2021', price: 3200, beds: 3, baths: 2, cars: 1, size: 180, propertyType: 'Townhouse', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80' },
  { id: 8, type: 'sale', title: 'Luxury Penthouse', suburb: 'South Yarra', state: 'VIC', postcode: '3141', price: 3200000, beds: 3, baths: 3, cars: 2, size: 210, propertyType: 'Apartment', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80' },
]

const STATES = ['All', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const PROP_TYPES = ['All', 'House', 'Apartment', 'Townhouse', 'Land']
const BED_OPTIONS = ['Any', '1+', '2+', '3+', '4+']

export default function Marketplace() {
  const [viewMode, setViewMode] = useState('grid')
  const [listingType, setListingType] = useState('all')
  const [stateFilter, setStateFilter] = useState('All')
  const [propType, setPropType] = useState('All')
  const [beds, setBeds] = useState('Any')
  const [saved, setSaved] = useState([])

  const filtered = PROPERTIES.filter(p => {
    if (listingType !== 'all' && p.type !== listingType) return false
    if (stateFilter !== 'All' && p.state !== stateFilter) return false
    if (propType !== 'All' && p.propertyType !== propType) return false
    if (beds !== 'Any' && p.beds < parseInt(beds)) return false
    return true
  })

  const formatPrice = (p, type) =>
    type === 'rent'
      ? `$${p.toLocaleString()}/mo`
      : p >= 1000000 ? `$${(p / 1000000).toFixed(2)}M` : `$${(p / 1000).toFixed(0)}k`

  const toggleSave = (id) =>
    setSaved(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])

  return (
    <div className="mp-page">
      <div className="mp-header">
        <div className="container">
          <div className="mp-header-row">
            <div>
              <h1>Find your property</h1>
              <p>{filtered.length} properties available</p>
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
          {saved.length > 0 && <span className="saved-count">❤ {saved.length} saved</span>}
        </div>

        {viewMode === 'grid' && (
          <div className="mp-grid">
            {filtered.length === 0 ? (
              <div className="no-results">No properties match your filters.</div>
            ) : filtered.map(p => (
              <div key={p.id} className="mp-card">
                <Link to={`/listing/${p.id}`} className="mp-card-img">
                  <img src={p.img} alt={p.title} />
                  <span className={`mp-badge ${p.type}`}>{p.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
                  <button
                    className={`save-btn ${saved.includes(p.id) ? 'saved' : ''}`}
                    onClick={e => { e.preventDefault(); toggleSave(p.id) }}
                  >{saved.includes(p.id) ? '❤' : '♡'}</button>
                </Link>
                <div className="mp-card-info">
                  <div className="mp-price">{formatPrice(p.price, p.type)}</div>
                  <h3>{p.title}</h3>
                  <p className="mp-location">📍 {p.suburb}, {p.state} {p.postcode}</p>
                  <div className="mp-stats">
                    <span>🛏 {p.beds}</span>
                    <span>🚿 {p.baths}</span>
                    <span>🚗 {p.cars}</span>
                    <span>📐 {p.size}m²</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'swipe' && (
          <SwipeDeck
            properties={filtered}
            saved={saved}
            onSave={toggleSave}
            formatPrice={formatPrice}
          />
        )}
      </div>
    </div>
  )
}

function SwipeDeck({ properties, saved, onSave, formatPrice }) {
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
        <p>{saved.length} saved to your favourites.</p>
        <button onClick={() => { setIndex(0); setHistory([]) }} className="btn-reset">See again</button>
      </div>
    )
  }

  const rotate = offset.x / 18
  const cardStyle = dragging
    ? { transform: `translate(${offset.x}px, ${offset.y * 0.3}px) rotate(${rotate}deg)`, transition: 'none', cursor: 'grabbing' }
    : { transform: 'translate(0,0) rotate(0deg)', transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1)', cursor: 'grab' }

  return (
    <div className="swipe-deck">
      <div className="swipe-progress">
        <span>{index + 1} of {properties.length}</span>
        {saved.length > 0 && <span className="swipe-saved-count">❤ {saved.length} saved</span>}
      </div>

      <div className="swipe-stage">
        {/* Behind card */}
        {properties[index + 1] && (
          <div className="swipe-card swipe-card-behind">
            <img src={properties[index + 1].img} alt="" draggable={false} />
          </div>
        )}

        {/* Active card */}
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
            <img src={current.img} alt={current.title} draggable={false} />
            <span className={`mp-badge ${current.type}`}>{current.type === 'sale' ? 'For Sale' : 'For Rent'}</span>
            {decision === 'like' && <div className="swipe-overlay like">❤ Save</div>}
            {decision === 'skip' && <div className="swipe-overlay skip">✕ Skip</div>}
          </div>
          <div className="swipe-info">
            <div className="swipe-price">{formatPrice(current.price, current.type)}</div>
            <h3>{current.title}</h3>
            <p>📍 {current.suburb}, {current.state} {current.postcode}</p>
            <div className="mp-stats">
              <span>🛏 {current.beds}</span>
              <span>🚿 {current.baths}</span>
              <span>🚗 {current.cars}</span>
              <span>📐 {current.size}m²</span>
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
