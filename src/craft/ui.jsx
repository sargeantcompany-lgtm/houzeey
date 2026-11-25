/* eslint-disable react-refresh/only-export-components */
/* Shared building blocks for the Craft design (cards, icons, prices, saves, likes). */
import { useEffect, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { isLoggedIn } from '../auth'

export const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-AU')

export function priceText(l) {
  if (!l) return ''
  if (l.price_display === 'contact') return 'Contact owner'
  if (l.price_display === 'range' && l.price_max) return `${money(l.price)} – ${money(l.price_max)}`
  return money(l.price)
}

export const TYPE_LABELS = { house: 'House', apartment: 'Apartment', townhouse: 'Townhouse', unit: 'Unit', land: 'Land', rural: 'Rural' }
export const typeLabel = t => TYPE_LABELS[String(t || '').toLowerCase()] || 'Home'
export const fullAddress = l => [l.address, `${l.suburb || ''}, ${l.state || ''} ${l.postcode || ''}`.trim()].filter(Boolean).join(', ')

export function hueFor(id) {
  let h = 0
  for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function statusLabel(l) {
  if (l.status === 'sold') return 'Sold'
  if (l.status === 'under_offer') return 'Under offer'
  return 'Private sale'
}

export function timeAgo(t) {
  const s = Math.max(1, Math.round((Date.now() - new Date(t).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60); if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago')
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago')
  const d = Math.round(h / 24); if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago')
  return new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Illustration shown when a home has no photos yet.
export function HouseArt({ hue = 0, type = 'house', className = 'art' }) {
  const h = Number(hue) || 0
  const sky1 = `hsl(${h},70%,86%)`, sky2 = `hsl(${(h + 30) % 360},60%,94%)`
  const wall = `hsl(${(h + 180) % 360},25%,96%)`, roof = `hsl(${h},45%,38%)`
  const t = String(type).toLowerCase()
  const gid = `g${h}${t}`
  let building
  if (t === 'apartment' || t === 'unit') {
    building = (<g><rect x="120" y="40" width="160" height="170" rx="4" fill={wall} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={140 + (i % 3) * 45} y={58 + Math.floor(i / 3) * 36} width="30" height="22" rx="2" fill={`hsl(${h},40%,72%)`} />)}
      <rect x="185" y="190" width="30" height="20" fill={roof} /></g>)
  } else if (t === 'land' || t === 'rural') {
    building = (<g><path d="M60 200 L340 200 L320 170 L80 170Z" fill="hsl(40,40%,70%)" /><rect x="190" y="130" width="4" height="45" fill={roof} /><path d="M194 130h40l-8 9 8 9h-40z" fill="#1b6570" /></g>)
  } else if (t === 'townhouse') {
    building = (<g>{[0, 1].map(k => (<g key={k} transform={`translate(${100 + k * 105} 0)`}><rect x="0" y="95" width="100" height="115" fill={wall} /><path d="M-6 98 50 55l56 43z" fill={roof} /><rect x="38" y="160" width="24" height="50" fill={roof} /><rect x="14" y="115" width="24" height="24" fill={`hsl(${h},40%,75%)`} /><rect x="62" y="115" width="24" height="24" fill={`hsl(${h},40%,75%)`} /></g>))}</g>)
  } else {
    building = (<g><rect x="115" y="105" width="170" height="105" fill={wall} /><path d="M100 110 200 45l100 65z" fill={roof} /><rect x="185" y="155" width="30" height="55" fill={roof} /><rect x="135" y="130" width="34" height="30" fill={`hsl(${h},40%,75%)`} /><rect x="231" y="130" width="34" height="30" fill={`hsl(${h},40%,75%)`} /></g>)
  }
  return (
    <svg className={className} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration of a ${typeLabel(t).toLowerCase()}`}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky1} /><stop offset="1" stopColor={sky2} /></linearGradient></defs>
      <rect width="400" height="240" fill={`url(#${gid})`} /><circle cx="330" cy="50" r="22" fill="hsl(45,95%,70%)" />
      <rect y="205" width="400" height="35" fill="hsl(110,35%,58%)" />{building}
      <circle cx="70" cy="180" r="28" fill="hsl(120,30%,45%)" /><rect x="67" y="185" width="6" height="25" fill="hsl(30,30%,35%)" />
    </svg>
  )
}

export function listingImages(l) {
  if (Array.isArray(l.images) && l.images.length) return l.images.map(i => (typeof i === 'string' ? i : i.url)).filter(Boolean)
  return l.primary_image ? [l.primary_image] : []
}

export function Cover({ listing }) {
  const img = listingImages(listing)[0]
  return img
    ? <img src={img} alt={`Photo of ${fullAddress(listing)}`} loading="lazy" />
    : <HouseArt hue={hueFor(listing.id)} type={listing.property_type} />
}

/* ---------- icons ---------- */
export const Icon = {
  bed: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M6 9V6h5v3M13 9V6h5v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  bath: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  car: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14M4 16v-4l2-5h12l2 5v4M4 16v3h3v-3M17 16v3h3v-3M7 12.5h.01M17 12.5h.01" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  land: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h3M4 14h3M9 4v3M14 4v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  heart: ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  comment: () => <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  share: () => <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  bookmark: () => <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.5-6 4.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
  sound: () => <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path className="wave" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path className="cross" d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  search: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  video: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="13.5" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m16 10.2 5.5-3.2v10l-5.5-3.2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>,
  tag: ({ size = 28 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 12.5 4H20v7.5L11.5 20z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="16" cy="8" r="1.7" fill="currentColor" /></svg>,
  close: () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  prev: () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  next: () => <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
}

export function FeatureLine({ listing: l, big = false }) {
  const isLand = ['land', 'rural'].includes(String(l.property_type).toLowerCase())
  return (
    <ul className={`features-line${big ? ' big' : ''}`}>
      {!isLand && l.beds != null && <li title="Bedrooms"><Icon.bed /><span>{l.beds}</span><span className="sr">bedrooms</span></li>}
      {!isLand && l.baths != null && <li title="Bathrooms"><Icon.bath /><span>{l.baths}</span><span className="sr">bathrooms</span></li>}
      {!isLand && l.cars != null && <li title="Car spaces"><Icon.car /><span>{l.cars}</span><span className="sr">car spaces</span></li>}
      {Number(l.land_size) > 0 && <li title="Land size"><Icon.land /><span>{Number(l.land_size).toLocaleString('en-AU')} m²</span></li>}
      <li className="type">{typeLabel(l.property_type)}</li>
    </ul>
  )
}

/* ---------- toast ---------- */
let toastTimer
export function toast(msg) {
  const t = document.getElementById('toast')
  if (!t) return
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200)
}

/* ---------- saved homes (shared across header, cards and pages) ---------- */
let savedIds = new Set()
let savedLoaded = false
const listeners = new Set()
const emit = () => listeners.forEach(fn => fn())
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn) }

export function loadSaved(force = false) {
  if (!isLoggedIn()) { savedIds = new Set(); savedLoaded = true; emit(); return Promise.resolve() }
  if (savedLoaded && !force) return Promise.resolve()
  savedLoaded = true
  return api.saved.list()
    .then(rows => { savedIds = new Set((rows || []).map(r => r.id || r.listing_id)); emit() })
    .catch(() => {})
}

export function useSaved() {
  useEffect(() => { loadSaved() }, [])
  return useSyncExternalStore(subscribe, () => savedIds)
}

export async function toggleSave(id, navigate) {
  if (!isLoggedIn()) { toast('Join or sign in to save homes'); navigate?.('/login'); return }
  const was = savedIds.has(id)
  savedIds = new Set(savedIds); was ? savedIds.delete(id) : savedIds.add(id); emit()
  try {
    if (was) await api.saved.unsave(id); else await api.saved.save(id)
    toast(was ? 'Removed from saved' : 'Saved')
  } catch (e) {
    savedIds = new Set(savedIds); was ? savedIds.add(id) : savedIds.delete(id); emit()
    toast(e.message || 'Could not update saved homes')
  }
}

export function resetSaved() { savedIds = new Set(); savedLoaded = false; emit() }

export async function shareListing(l) {
  const link = `${window.location.origin}/listing/${l.id}`
  try {
    if (navigator.share) await navigator.share({ title: fullAddress(l), text: priceText(l), url: link })
    else { await navigator.clipboard.writeText(link); toast('Link copied') }
  } catch { /* cancelled */ }
}

export function ListingCard({ listing: l, saved, onToggleSave }) {
  const badgeCls = l.status === 'sold' ? 'is-sold' : l.status === 'under_offer' ? 'is-offer' : ''
  return (
    <article className="card">
      <Link className="card-media" to={`/listing/${l.id}`} tabIndex={-1} aria-hidden="true"><Cover listing={l} /></Link>
      <span className={`card-badge ${badgeCls}`}>{statusLabel(l)}</span>
      <button className={`heart ${saved ? 'is-saved' : ''}`} onClick={() => onToggleSave(l.id)} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save property'}><Icon.heart /></button>
      <div className="card-body">
        <p className="card-price">{priceText(l)}</p>
        <h3 className="card-address"><Link to={`/listing/${l.id}`}>{l.address}, <span>{l.suburb}, {l.state} {l.postcode}</span></Link></h3>
        <FeatureLine listing={l} />
        <p className="card-owner">Listed by owner{l.seller_name ? ` · ${l.seller_name}` : ''}</p>
      </div>
    </article>
  )
}

export function Avatar({ name, id, className = 'sm' }) {
  return <span className={`avatar ${className}`} style={{ '--h': hueFor(id || name) }} aria-hidden="true">{String(name || '?').trim().charAt(0).toUpperCase()}</span>
}

export const STATES = [
  { code: 'NSW', name: 'New South Wales' }, { code: 'VIC', name: 'Victoria' }, { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' }, { code: 'SA', name: 'South Australia' }, { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' }, { code: 'NT', name: 'Northern Territory' },
]
