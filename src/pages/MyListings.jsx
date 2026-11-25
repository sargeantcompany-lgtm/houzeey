import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { Cover, FeatureLine, priceText, toast } from '../craft/ui'

const STATUS = {
  pending_review: ['Awaiting solicitor review', 'is-wait'],
  changes_requested: ['Changes requested', 'is-turn'],
  active: ['Live', 'is-ok'],
  under_offer: ['Under offer', 'is-offer'],
  sold: ['Sold', 'is-sold'],
  withdrawn: ['Withdrawn', 'is-muted'],
}
const VIDEO = { uploading: 'Video uploading', processing: 'Video processing…', ready: 'Video tour live', failed: 'Video failed – re-upload it from Edit' }

export default function MyListings() {
  const location = useLocation()
  const [listings, setListings] = useState(null)
  const [videos, setVideos] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const notice = location.state?.listingSubmitted
    ? 'Listing submitted. We have emailed your solicitor or conveyancer a review link. Your listing goes live as soon as they approve it.'
    : ''

  const load = useCallback(() => {
    api.listings.mine().then(setListings).catch(e => { setListings([]); setError(e.message) })
    api.videos.mine().then(setVideos).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!videos.some(v => ['uploading', 'processing'].includes(v.status))) return undefined
    const t = setInterval(() => api.videos.mine().then(setVideos).catch(() => {}), 5000)
    return () => clearInterval(t)
  }, [videos])

  async function run(id, fn, done) {
    setBusy(id)
    try { await fn(); toast(done); load() } catch (e) { toast(e.message) } finally { setBusy(null) }
  }

  return (
    <>
      <section className="page-intro">
        <div className="container intro-row">
          <div>
            <h1>My listings</h1>
            <p className="muted">Manage your properties, offers and buyer messages.</p>
          </div>
          <Link className="btn btn-primary" to="/sell">+ New listing</Link>
        </div>
      </section>
      <div className="container">
        {notice && <p className="offer-status" role="status" style={{ marginTop: 24 }}><strong>Sent for review</strong><span>{notice}</span></p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {listings === null ? <p className="muted" style={{ padding: '32px 0' }}>Loading…</p> : listings.length ? (
          <div className="mine-list">
            {listings.map(l => {
              const [label, cls] = STATUS[l.status] || [l.status, 'is-muted']
              const video = videos.find(v => v.listing_id === l.id)
              const reviewNote = l.solicitor_review_status === 'changes_requested'
              return (
                <article key={l.id} className="mine-item">
                  <Link className="mine-media" to={`/listing/${l.id}`}><Cover listing={l} /></Link>
                  <div className="mine-body">
                    <span className={`pill ${reviewNote ? 'is-turn' : cls}`}>{reviewNote ? 'Solicitor requested changes' : label}</span>
                    {video && <span className="pill is-muted" style={{ marginLeft: 6 }}>{VIDEO[video.status] || video.status}</span>}
                    <h2><Link to={`/listing/${l.id}`}>{l.address}, {l.suburb} {l.state} {l.postcode}</Link></h2>
                    <p className="muted">{priceText(l)} · {l.views || 0} views · {Number(l.enquiries) || 0} messages</p>
                    <FeatureLine listing={l} />
                    <div className="mine-actions" style={{ marginTop: 12 }}>
                      <Link className="btn btn-outline btn-sm" to={`/listing/${l.id}`}>View</Link>
                      <Link className="btn btn-outline btn-sm" to={`/listing/${l.id}/edit`}>Edit</Link>
                      <Link className="btn btn-outline btn-sm" to="/offers?tab=selling">Offers</Link>
                      <Link className="btn btn-outline btn-sm" to="/messages">Messages</Link>
                      {l.status === 'pending_review' && (
                        <button className="btn btn-outline btn-sm" disabled={busy === l.id}
                          onClick={() => run(l.id, () => api.listings.resendSolicitorReview(l.id), 'Review link sent to your solicitor again')}>Resend solicitor invite</button>
                      )}
                      {l.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" disabled={busy === l.id}
                          onClick={() => run(l.id, () => api.listings.update(l.id, { status: 'withdrawn' }), 'Listing taken off the market')}>Take off market</button>
                      )}
                      <button className="btn btn-ghost btn-sm danger" disabled={busy === l.id}
                        onClick={() => window.confirm('Delete this listing? This cannot be undone.') && run(l.id, () => api.listings.delete(l.id), 'Listing deleted')}>Delete</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            <h2>You haven&apos;t listed a property yet</h2>
            <p>It&apos;s free and takes about ten minutes.</p>
            <Link className="btn btn-primary" to="/sell">List your property</Link>
          </div>
        )}
      </div>
    </>
  )
}
