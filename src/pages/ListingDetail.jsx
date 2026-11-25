import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { getSession, isLoggedIn } from '../auth'
import { Avatar, FeatureLine, HouseArt, Icon, fullAddress, hueFor, money, priceText, shareListing, statusLabel, toast, toggleSave, useSaved } from '../craft/ui'

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function OfferModal({ listing, onClose }) {
  const navigate = useNavigate()
  const suggested = Number(listing.price) > 0 ? Math.round(Number(listing.price) / 1000) * 1000 : ''
  const [form, setForm] = useState({ amount: suggested, deposit: '10', days: '42', finance: true, bp: true, saleOfHome: false, message: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  useEffect(() => {
    const key = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    document.body.classList.add('no-scroll')
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('no-scroll') }
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount < 1000) { setError('Enter your offer in dollars, for example 850000.'); return }
    setSending(true); setError('')
    try {
      const offer = await api.offers.submit({
        listing_id: listing.id,
        offer_price: amount,
        deposit_amount: Math.round(amount * Number(form.deposit) / 100),
        settlement_date: addDays(Number(form.days)),
        finance_clause: form.finance,
        finance_days: form.finance ? 14 : null,
        building_inspection: form.bp,
        building_days: form.bp ? 14 : null,
        conditions: form.saleOfHome ? 'Subject to sale of the buyer\'s home' : null,
      })
      if (form.message.trim()) {
        await api.conversations.start({ recipient_id: listing.user_id, listing_id: listing.id, message: form.message.trim() }).catch(() => {})
      }
      toast('Offer sent to the owner')
      navigate(`/offers?tab=buying&id=${offer.id}`)
    } catch (err) {
      setError(err.message || 'Could not send your offer.')
      setSending(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="offerTitle" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-wide">
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Icon.close /></button>
        <h2 id="offerTitle">Make an offer</h2>
        <p className="muted">{fullAddress(listing)} · {priceText(listing)}</p>
        <form onSubmit={submit} noValidate>
          <div className="field-grid">
            <label className="field span-2"><span>Your offer ($)</span><input type="number" min="1000" step="1" inputMode="numeric" value={form.amount} onChange={set('amount')} required autoFocus /></label>
            <label className="field"><span>Deposit</span>
              <select value={form.deposit} onChange={set('deposit')}><option value="5">5%</option><option value="10">10%</option></select>
            </label>
            <label className="field"><span>Settlement</span>
              <select value={form.days} onChange={set('days')}>{[30, 42, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select>
            </label>
          </div>
          <fieldset className="checks">
            <legend>Conditions (leave all unticked for an unconditional offer)</legend>
            <label><input type="checkbox" checked={form.finance} onChange={set('finance')} /> Subject to finance</label>
            <label><input type="checkbox" checked={form.bp} onChange={set('bp')} /> Subject to building and pest inspection</label>
            <label><input type="checkbox" checked={form.saleOfHome} onChange={set('saleOfHome')} /> Subject to sale of my home</label>
          </fieldset>
          <label className="field"><span>Message to the owner (optional)</span><textarea rows={3} value={form.message} onChange={set('message')} placeholder="e.g. We're pre-approved and can be flexible on settlement." /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send offer'}</button>
          <p className="muted small-print">An offer here isn&apos;t legally binding. A sale is only agreed once both sides sign a contract of sale prepared by a conveyancer or solicitor.</p>
        </form>
      </div>
    </div>
  )
}

function Repayments({ price }) {
  const [deposit, setDeposit] = useState(Math.round((Number(price) || 0) * 0.2))
  const [rate, setRate] = useState(6.09)
  const [term, setTerm] = useState(30)
  const loan = Math.max(0, (Number(price) || 0) - (Number(deposit) || 0))
  const r = (Number(rate) || 0) / 100 / 12, n = term * 12
  const monthly = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n
  return (
    <div className="repay">
      <label className="field"><span>Deposit</span><input type="number" min="0" step="1000" value={deposit} onChange={e => setDeposit(e.target.value)} /></label>
      <label className="field"><span>Interest rate (%)</span><input type="number" min="0" max="20" step="0.05" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <label className="field"><span>Loan term (years)</span>
        <select value={term} onChange={e => setTerm(Number(e.target.value))}>{[15, 20, 25, 30].map(t => <option key={t}>{t}</option>)}</select>
      </label>
      <div className="repay-out">
        <span>Estimated monthly repayment</span>
        <strong>{money(monthly || 0)}</strong>
        <small className="muted">Principal and interest. A guide only, not a loan offer.</small>
      </div>
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const saved = useSaved()
  const session = getSession()
  const [listing, setListing] = useState(null)
  const [missing, setMissing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [slots, setSlots] = useState([])
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [topics, setTopics] = useState([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [msgError, setMsgError] = useState('')

  useEffect(() => {
    let live = true
    setListing(null); setMissing(false); setSlide(0)
    api.listings.get(id).then(l => live && setListing(l)).catch(() => live && setMissing(true))
    api.inspections.slots(id).then(s => live && setSlots(s)).catch(() => {})
    api.social.comments(id).then(c => live && setComments(c)).catch(() => {})
    return () => { live = false }
  }, [id])

  const slides = useMemo(() => {
    if (!listing) return []
    const imgs = (listing.images || []).map(i => i.url).filter(Boolean)
    return [
      ...(listing.video ? [{ video: listing.video }] : []),
      ...(imgs.length ? imgs.map(src => ({ img: src })) : [0, 40, 80].map(d => ({ art: d }))),
    ]
  }, [listing])

  if (missing) {
    return (
      <div className="container empty">
        <h1>We couldn&apos;t find that property</h1>
        <p>It may have been removed by its owner, or it isn&apos;t live yet.</p>
        <Link className="btn btn-primary" to="/buy">Browse properties</Link>
      </div>
    )
  }
  if (!listing) return <div className="container property"><p className="muted">Loading…</p></div>

  const isOwner = session?.id === listing.user_id
  const canOffer = listing.status === 'active' && !isOwner
  const offerOpen = params.get('offer') === '1' && canOffer
  const closeOffer = () => { const p = new URLSearchParams(params); p.delete('offer'); setParams(p, { replace: true }) }
  const openOffer = () => {
    if (!isLoggedIn()) { toast('Join or sign in to make an offer'); navigate('/login'); return }
    const p = new URLSearchParams(params); p.set('offer', '1'); setParams(p)
  }
  const isSaved = saved.has(listing.id)
  const cur = slides[slide] || slides[0]

  async function sendMessage(e) {
    e.preventDefault()
    const body = [topics.length ? `I'd like to: ${topics.join(', ')}.` : '', message.trim()].filter(Boolean).join('\n\n')
    if (!body) { setMsgError('Write a message to the owner.'); return }
    setSending(true); setMsgError('')
    try {
      await api.conversations.start({ recipient_id: listing.user_id, listing_id: listing.id, message: body })
      setSent(true)
    } catch (err) { setMsgError(err.message || 'Could not send your message.') } finally { setSending(false) }
  }

  async function postComment(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    if (!isLoggedIn()) { toast('Join or sign in to comment'); navigate('/login'); return }
    try { const c = await api.social.comment(listing.id, text); setComments(list => [...list, c]); setDraft('') } catch (err) { toast(err.message) }
  }

  const toggleTopic = t => setTopics(list => (list.includes(t) ? list.filter(x => x !== t) : [...list, t]))

  return (
    <div className="container property">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">›</span>
        <Link to="/buy">Buy</Link><span aria-hidden="true">›</span>
        <Link to={`/buy?q=${encodeURIComponent(listing.suburb)}`}>{listing.suburb}</Link><span aria-hidden="true">›</span>
        <span>{listing.address}</span>
      </nav>

      <div className="gallery">
        <div className="gallery-main">
          {cur?.video && <div className="gallery-video"><video src={cur.video.url} poster={cur.video.thumbnailUrl} controls playsInline /></div>}
          {cur?.img && <img src={cur.img} alt={`Photo ${slide + 1} of ${fullAddress(listing)}`} />}
          {cur?.art != null && <HouseArt hue={(hueFor(listing.id) + cur.art) % 360} type={listing.property_type} />}
        </div>
        {slides.length > 1 && <>
          <button className="gallery-btn prev" onClick={() => setSlide(s => (s - 1 + slides.length) % slides.length)} aria-label="Previous photo"><Icon.prev /></button>
          <button className="gallery-btn next" onClick={() => setSlide(s => (s + 1) % slides.length)} aria-label="Next photo"><Icon.next /></button>
        </>}
        <span className="gallery-count">{slide + 1} / {slides.length}</span>
      </div>

      <div className="property-layout">
        <article className="property-main">
          <div className="property-headline">
            <div>
              <span className={`pill ${listing.status === 'under_offer' ? 'is-offer' : listing.status === 'sold' ? 'is-sold' : ''}`}>{statusLabel(listing)}</span>
              <h1>{fullAddress(listing)}</h1>
              <p className="property-price">{priceText(listing)}</p>
            </div>
            <div className="property-actions">
              <button className={`btn btn-outline ${isSaved ? 'is-saved' : ''}`} id="pSave" aria-pressed={isSaved} onClick={() => toggleSave(listing.id, navigate)}>
                <Icon.heart size={18} /><span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
              <button className="btn btn-outline" onClick={() => shareListing(listing)}>Share</button>
            </div>
          </div>
          <FeatureLine listing={listing} big />

          <section className="panel">
            <h2>About this property</h2>
            <div className="prose">
              <p className="lead">{listing.title}</p>
              {String(listing.description || '').split(/\n{2,}/).map((para, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{para}</p>)}
            </div>
          </section>

          {listing.features?.length > 0 && (
            <section className="panel">
              <h2>Property features</h2>
              <ul className="tick-list">{listing.features.map(f => <li key={f}>{f}</li>)}</ul>
            </section>
          )}

          <section className="panel">
            <h2>Inspection times</h2>
            {slots.length ? (
              <ul className="inspect-list">
                {slots.map(s => (
                  <li key={s.id}><span className="cal" aria-hidden="true" />{new Date(s.datetime).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    <Link className="link-arrow" style={{ marginLeft: 'auto' }} to={`/inspections/${listing.id}`}>Book</Link></li>
                ))}
              </ul>
            ) : <p className="muted">No open homes scheduled. <Link to={`/inspections/${listing.id}`}>Request an inspection</Link> or message the owner.</p>}
          </section>

          {Number(listing.price) > 0 && (
            <section className="panel">
              <h2>Home loan repayments</h2>
              <Repayments price={listing.price} />
            </section>
          )}

          <section className="panel" id="comments">
            <h2>Comments {comments.length > 0 && <span className="muted">({comments.length})</span>}</h2>
            {comments.length ? <ul className="post-comments" style={{ margin: '0 0 12px' }}>{comments.map(c => <li key={c.id}><b>{c.name}</b> {c.body}</li>)}</ul> : <p className="muted">No comments yet.</p>}
            <form className="msg-form" onSubmit={postComment}>
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" maxLength={300} />
              <button className="btn btn-outline btn-sm" type="submit">Post</button>
            </form>
          </section>
        </article>

        <aside className="property-side">
          <div className="contact-card">
            <div className="owner">
              <Avatar name={listing.seller_name} id={listing.user_id} className="" />
              <div>
                <strong>{listing.seller_name}</strong>
                <span className="muted">Owner · selling privately</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {listing.seller_verified && '✓ Identity checked'}{listing.seller_verified && listing.solicitor_review_status === 'approved' && ' · '}
                  {listing.solicitor_review_status === 'approved' && '✓ Solicitor reviewed'}
                </span>
              </div>
            </div>

            {isOwner ? (
              <div className="offer-cta">
                <p className="offer-status"><strong>This is your listing</strong><span className="muted">Manage offers and edits from My listings.</span></p>
                <Link className="btn btn-primary btn-block" to="/my-listings">Go to My listings</Link>
                <Link className="btn btn-outline btn-block" to="/offers?tab=selling">Offers on this home</Link>
              </div>
            ) : listing.status === 'active' ? (
              <div className="offer-cta">
                <button className="btn btn-primary btn-block btn-lg" onClick={openOffer}>Make an offer</button>
                <p className="offer-sub muted">Price, deposit, settlement and conditions, straight to the owner.</p>
              </div>
            ) : (
              <div className="offer-cta">
                <p className="offer-status"><strong>{statusLabel(listing)}</strong><span className="muted">The owner has accepted an offer on this home.</span></p>
              </div>
            )}

            {!isOwner && (sent ? (
              <div className="sent">
                <h2>Message sent</h2>
                <p className="muted">The owner will reply in Houzeey. We&apos;ll show it under Messages.</p>
                <Link className="btn btn-outline" to="/messages">Go to Messages</Link>
              </div>
            ) : isLoggedIn() ? (
              <form onSubmit={sendMessage} noValidate>
                <h2 className="contact-title">Message the owner</h2>
                <fieldset className="checks">
                  <legend>I&apos;d like to</legend>
                  {['Inspect the property', 'Know more about the price', 'Get the contract of sale'].map(t => (
                    <label key={t}><input type="checkbox" checked={topics.includes(t)} onChange={() => toggleTopic(t)} /> {t}</label>
                  ))}
                </fieldset>
                <label className="field"><span>Message</span><textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Hi, I'm interested in this home…" /></label>
                {msgError && <p className="form-error" role="alert">{msgError}</p>}
                <button className="btn btn-outline btn-block" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
                <p className="muted small-print">Messages stay inside Houzeey. Your email and phone aren&apos;t shared.</p>
              </form>
            ) : (
              <div>
                <h2 className="contact-title">Message the owner</h2>
                <p className="muted">Join or sign in to message the owner. Your contact details stay private.</p>
                <Link className="btn btn-outline btn-block" to="/login">Sign in</Link>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {offerOpen && <OfferModal listing={listing} onClose={closeOffer} />}
    </div>
  )
}
