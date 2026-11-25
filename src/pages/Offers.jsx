import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Cover, money, priceText, toast } from '../craft/ui'

// Which document each state calls the seller disclosure, and its cooling-off period.
const STATE_RULES = {
  NSW: { disc: 'Contract with the prescribed disclosure documents attached', cool: '5 business days' },
  VIC: { disc: 'Vendor statement (Section 32)', cool: '3 business days' },
  QLD: { disc: 'Seller disclosure statement (Form 2)', cool: '5 business days' },
  SA: { disc: 'Form 1 vendor statement', cool: '2 clear business days' },
  WA: { disc: 'Title search and disclosure documents', cool: 'no statutory cooling-off' },
  TAS: { disc: 'Title, planning and disclosure documents', cool: 'no statutory cooling-off' },
  ACT: { disc: 'Required documents (including building and pest reports) with the contract', cool: '5 business days' },
  NT: { disc: 'Contract disclosure documents (including building certification)', cool: '4 business days' },
}

const fmtStamp = t => new Date(t).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const fmtDate = t => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

function termsText(o) {
  const parts = []
  if (o.deposit_amount) parts.push(`${money(o.deposit_amount)} deposit`)
  if (o.settlement_date) parts.push(`settle ${fmtDate(o.settlement_date)}`)
  const conds = []
  if (o.finance_clause) conds.push('finance')
  if (o.building_inspection) conds.push('building & pest')
  if (o.conditions) conds.push(o.conditions)
  parts.push(conds.length ? `subject to ${conds.join(', ')}` : 'unconditional')
  return parts.join(' · ')
}

function checklistFor(o) {
  const r = STATE_RULES[o.listing_state] || STATE_RULES.NSW
  const items = [
    { k: 'voi_s', t: 'Verification of identity (VOI) for the seller', who: "Seller's solicitor" },
    { k: 'voi_b', t: 'Verification of identity (VOI) for the buyer', who: "Buyer's solicitor" },
    { k: 'aml', t: 'Anti-money-laundering (AML/CTF) checks on both parties', who: 'Both solicitors' },
    { k: 'disc', t: `${r.disc} (${o.listing_state || 'your state'})`, who: "Seller's solicitor" },
    { k: 'contract', t: "Contract of sale prepared and sent to the buyer's solicitor", who: "Seller's solicitor" },
    { k: 'review', t: 'Contract reviewed and the buyer advised', who: "Buyer's solicitor" },
    { k: 'exchange', t: 'Contracts signed and exchanged', who: 'Both solicitors' },
    { k: 'cooling', t: `Cooling-off period ended (${o.listing_state || ''}: ${r.cool})`, who: 'Buyer' },
    { k: 'deposit', t: `Deposit${o.deposit_amount ? ` of ${money(o.deposit_amount)}` : ''} paid into the trust account`, who: 'Buyer' },
  ]
  if (o.finance_clause) items.push({ k: 'finance', t: 'Finance approved, condition satisfied', who: 'Buyer' })
  if (o.building_inspection) items.push({ k: 'bp', t: 'Building and pest inspection done, condition satisfied', who: 'Buyer' })
  items.push({ k: 'pexa', t: 'Settlement booked (PEXA electronic settlement)', who: 'Both solicitors' })
  items.push({ k: 'settled', t: 'Settled: balance paid and keys handed over', who: 'Both solicitors' })
  return items
}

async function downloadLetter(id) {
  try {
    const res = await fetch(api.offers.pdf(id), { headers: { Authorization: `Bearer ${localStorage.getItem('houzeey_token')}` } })
    if (!res.ok) throw new Error()
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url; a.download = 'houzeey-letter-of-offer.pdf'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch { toast('Could not download the letter of offer') }
}

function SolicitorCard({ side, mine, solicitor, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({ name: solicitor?.name || '', firm: solicitor?.firm || '', email: solicitor?.email || '', phone: solicitor?.phone || '', licence: solicitor?.licence || '' }))
  const [error, setError] = useState('')
  const title = side === 'seller' ? "Seller's solicitor or conveyancer" : "Buyer's solicitor or conveyancer"
  const showForm = mine && (!solicitor || editing)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    try { await onSave(side, form); setEditing(false) } catch (err) { setError(err.message) }
  }

  return (
    <div className={`sol-card ${solicitor ? 'is-set' : ''}`}>
      <h4>{title}{mine && <span className="you-tag">You</span>}</h4>
      {showForm ? (
        <form className="sol-form" onSubmit={submit} noValidate>
          <label className="field"><span>Name</span><input value={form.name} onChange={set('name')} required /></label>
          <label className="field"><span>Firm</span><input value={form.firm} onChange={set('firm')} /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={set('email')} required /></label>
          <label className="field"><span>Phone</span><input type="tel" value={form.phone} onChange={set('phone')} /></label>
          <label className="field"><span>Licence or registration no. (optional)</span><input value={form.licence} onChange={set('licence')} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="row-actions"><button className="btn btn-primary btn-sm" type="submit">Save solicitor</button>{solicitor && <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>Cancel</button>}</div>
        </form>
      ) : solicitor ? (
        <>
          <dl className="sol-details">
            <dt>Name</dt><dd>{solicitor.name}</dd>
            {solicitor.firm && <><dt>Firm</dt><dd>{solicitor.firm}</dd></>}
            <dt>Email</dt><dd><a href={`mailto:${solicitor.email}`}>{solicitor.email}</a></dd>
            {solicitor.phone && <><dt>Phone</dt><dd>{solicitor.phone}</dd></>}
            {solicitor.licence && <><dt>Licence</dt><dd>{solicitor.licence}</dd></>}
          </dl>
          {mine && <button className="linkish" onClick={() => setEditing(true)}>Change</button>}
        </>
      ) : (
        <p className="muted waiting"><span className="pulse" aria-hidden="true" />Waiting for the {side} to add their solicitor.</p>
      )}
    </div>
  )
}

function Handover({ offer }) {
  const [deal, setDeal] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => api.offers.deal(offer.id).then(setDeal).catch(e => toast(e.message)), [offer.id])
  useEffect(() => { load() }, [load])
  if (!deal) return <p className="muted">Loading the handover…</p>

  const items = checklistFor(offer)
  const done = items.filter(i => deal.checklist[i.k]).length
  const both = deal.solicitors.seller && deal.solicitors.buyer
  const settled = !!deal.checklist.settled

  async function saveSolicitor(side, form) { setDeal(await api.offers.setSolicitor(offer.id, side, form)) }
  async function tick(key, on) {
    try { setDeal(d => ({ ...d, ...{} })); const next = await api.offers.tick(offer.id, key, on); setDeal(d => ({ ...d, ...next })) } catch (e) { toast(e.message) }
  }
  async function send() {
    setBusy(true)
    try { const next = await api.offers.handover(offer.id); setDeal(d => ({ ...d, ...next })); toast('Deal emailed to both solicitors') } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="handover" aria-label="Hand over to solicitors">
      <div className="handover-head">
        <span className="handover-step">Agreed at {money(offer.offer_price)}</span>
        <h3>Next: hand the deal to your solicitors</h3>
        <p className="muted">Each side adds their solicitor or conveyancer. Houzeey emails them the agreed terms, then they handle identity checks, anti-money-laundering checks, disclosure, the contract and settlement.</p>
      </div>
      <div className="sol-grid">
        <SolicitorCard key={`s-${deal.solicitors.seller?.updated_at || 'none'}`} side="seller" mine={deal.my_side === 'seller'} solicitor={deal.solicitors.seller} onSave={saveSolicitor} />
        <SolicitorCard key={`b-${deal.solicitors.buyer?.updated_at || 'none'}`} side="buyer" mine={deal.my_side === 'buyer'} solicitor={deal.solicitors.buyer} onSave={saveSolicitor} />
      </div>
      {both ? (
        <div className="handover-send">
          <button className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'Sending…' : deal.handover_at ? 'Email the solicitors again' : 'Email the deal to both solicitors'}</button>
          <button className="btn btn-outline btn-sm" onClick={() => downloadLetter(offer.id)}>Letter of offer (PDF)</button>
          {deal.handover_at && <span className="sent-note">✓ Sent {fmtStamp(deal.handover_at)}</span>}
        </div>
      ) : (
        <p className="muted handover-wait">Once both solicitors are added, you can email them the agreed price, terms and contacts in one go. <button className="linkish" onClick={() => downloadLetter(offer.id)}>Download the letter of offer</button></p>
      )}
      <div className="settle">
        <div className="settle-head"><h4>Settlement checklist</h4><span className="muted">{done} of {items.length} done</span></div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Settlement progress"><i style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></div>
        <ul className="checklist">
          {items.map(it => {
            const d = deal.checklist[it.k]
            return (
              <li key={it.k} className={d ? 'is-done' : ''}>
                <label><input type="checkbox" checked={!!d} onChange={e => tick(it.k, e.target.checked)} /><span className="ck-text">{it.t}</span></label>
                <span className="ck-who">{it.who}{d ? ` · ${fmtDate(d.done_at)}${d.by ? ` by ${d.by}` : ''}` : ''}</span>
              </li>
            )
          })}
        </ul>
        <p className="muted small-print">The solicitors run these steps. Tick each one off as they confirm it, so both sides can see where things are. Rules differ by state, so your solicitor confirms what applies.</p>
      </div>
      {settled && <div className="settled-banner"><strong>Settled.</strong> Congratulations on your private sale!</div>}
    </section>
  )
}

const VERBS = { submitted: 'offered', countered: 'countered with', accepted: 'accepted', rejected: 'declined the offer', withdrawn: 'withdrew the offer' }

function OfferCard({ offer, tab, focus, onChanged }) {
  const mySide = tab === 'buying' ? 'buyer' : 'seller'
  const otherName = tab === 'buying' ? offer.seller_name : offer.buyer_name
  const active = ['pending', 'countered'].includes(offer.status)
  const myTurn = active && offer.current_offer_by !== mySide
  const [countering, setCountering] = useState(false)
  const [counter, setCounter] = useState({ amount: Math.round(Number(offer.offer_price)), days: '42', note: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const status = offer.status === 'accepted' ? ['Agreed', 'is-ok']
    : offer.status === 'rejected' ? ['Declined', 'is-muted']
      : offer.status === 'withdrawn' ? ['Withdrawn', 'is-muted']
        : myTurn ? ['Your turn to reply', 'is-turn'] : [`Waiting for ${String(otherName || '').split(' ')[0]}`, 'is-wait']

  async function act(kind) {
    if (kind === 'accept' && !window.confirm(`Accept ${money(offer.offer_price)}? The other side will be told and the home will show as under offer.`)) return
    if (kind === 'reject' && !window.confirm('Decline this offer?')) return
    if (kind === 'withdraw' && !window.confirm('Withdraw your offer?')) return
    setBusy(true); setError('')
    try {
      if (kind === 'accept') await api.offers.accept(offer.id)
      if (kind === 'reject') await api.offers.reject(offer.id)
      if (kind === 'withdraw') await api.offers.withdraw(offer.id)
      toast(kind === 'accept' ? 'Offer accepted' : kind === 'reject' ? 'Offer declined' : 'Offer withdrawn')
      onChanged()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function sendCounter(e) {
    e.preventDefault()
    const amount = Number(counter.amount)
    if (!Number.isFinite(amount) || amount < 1000) { setError('Enter a counter-offer in dollars.'); return }
    setBusy(true); setError('')
    const d = new Date(); d.setDate(d.getDate() + Number(counter.days))
    try {
      await api.offers.counter(offer.id, { offer_price: amount, settlement_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, note: counter.note.trim() || undefined })
      toast('Counter-offer sent'); setCountering(false); onChanged()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!msg.trim()) return
    try {
      await api.conversations.start({ recipient_id: tab === 'buying' ? offer.seller_id : offer.buyer_id, listing_id: offer.listing_id, message: msg.trim() })
      setMsg(''); toast('Message sent')
    } catch (err) { toast(err.message) }
  }

  const address = [offer.listing_address, `${offer.listing_suburb || ''}, ${offer.listing_state || ''} ${offer.listing_postcode || ''}`].join(', ')
  return (
    <article className={`offer-card ${focus ? 'is-focus' : ''}`} id={`offer-${offer.id}`}>
      <div className="offer-head">
        <Link className="offer-thumb" to={`/listing/${offer.listing_id}`} tabIndex={-1} aria-hidden="true">
          <Cover listing={{ id: offer.listing_id, primary_image: offer.listing_image, property_type: 'house', address }} />
        </Link>
        <div className="offer-meta">
          <span className={`pill ${status[1]}`}>{status[0]}</span>
          <h2><Link to={`/listing/${offer.listing_id}`}>{address}</Link></h2>
          <p className="muted">{priceText({ price: offer.listing_price, price_display: offer.listing_price_display })} · {tab === 'buying' ? `Owner: ${offer.seller_name}` : `Buyer: ${offer.buyer_name}`}</p>
        </div>
        <div className="offer-current"><span className="muted">{offer.status === 'accepted' ? 'Agreed price' : 'On the table'}</span><strong>{money(offer.offer_price)}</strong><small>{termsText(offer)}</small></div>
      </div>
      <ol className="timeline" aria-label="Negotiation history">
        {(offer.history || []).map((h, i) => {
          const mine = h.made_by_role === mySide
          const cls = h.action === 'accepted' ? 'ev-accept' : h.action === 'rejected' ? 'ev-decline' : h.action === 'withdrawn' ? 'ev-withdraw' : ''
          return (
            <li key={i} className={`ev ${mine ? 'ev-me' : 'ev-them'} ${cls}`}>
              <span className="ev-dot" aria-hidden="true" />
              <div className="ev-body">
                <p><strong>{mine ? 'You' : h.made_by_role === 'buyer' ? offer.buyer_name || 'Buyer' : offer.seller_name || 'Owner'}</strong> {VERBS[h.action] || h.action}{h.offer_price && ['submitted', 'countered', 'accepted'].includes(h.action) ? <> <b>{money(h.offer_price)}</b></> : null}</p>
                {h.settlement_date && h.action !== 'accepted' && <p className="ev-terms">Settlement {fmtDate(h.settlement_date)}</p>}
                {h.note && <blockquote>{h.note}</blockquote>}
                <time className="muted">{fmtStamp(h.created_at)}</time>
              </div>
            </li>
          )
        })}
      </ol>
      {error && <p className="form-error" role="alert">{error}</p>}
      {myTurn && (
        <>
          <div className="offer-actions">
            <button className="btn btn-primary btn-sm" onClick={() => act('accept')} disabled={busy}>Accept {money(offer.offer_price)}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setCountering(c => !c)} disabled={busy}>Counter-offer</button>
            {tab === 'selling'
              ? <button className="btn btn-ghost btn-sm danger" onClick={() => act('reject')} disabled={busy}>Decline</button>
              : <button className="btn btn-ghost btn-sm danger" onClick={() => act('withdraw')} disabled={busy}>Withdraw</button>}
          </div>
          {countering && (
            <form className="counter-form" onSubmit={sendCounter} noValidate>
              <div className="field-grid">
                <label className="field"><span>Counter-offer ($)</span><input type="number" min="1000" step="1" value={counter.amount} onChange={e => setCounter(c => ({ ...c, amount: e.target.value }))} required /></label>
                <label className="field"><span>Settlement</span><select value={counter.days} onChange={e => setCounter(c => ({ ...c, days: e.target.value }))}>{[30, 42, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
              </div>
              <label className="field"><span>Message (optional)</span><textarea rows={2} value={counter.note} onChange={e => setCounter(c => ({ ...c, note: e.target.value }))} /></label>
              <div className="row-actions"><button className="btn btn-primary btn-sm" type="submit" disabled={busy}>Send counter-offer</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => setCountering(false)}>Cancel</button></div>
            </form>
          )}
        </>
      )}
      {active && !myTurn && (
        <div className="offer-actions">
          <span className="muted waiting"><span className="pulse" aria-hidden="true" />Waiting for {String(otherName || '').split(' ')[0]} to reply</span>
          {tab === 'buying' && <button className="btn btn-ghost btn-sm danger" onClick={() => act('withdraw')} disabled={busy}>Withdraw</button>}
        </div>
      )}
      {offer.status === 'accepted' && <Handover offer={offer} />}
      {active && (
        <form className="msg-form" onSubmit={sendMessage}>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Send a message without changing the offer" aria-label="Message" />
          <button className="btn btn-outline btn-sm" type="submit">Send</button>
        </form>
      )}
    </article>
  )
}

export default function Offers() {
  const { listingId, offerId } = useParams()
  const [params, setParams] = useSearchParams()
  const [buying, setBuying] = useState(null)
  const [selling, setSelling] = useState(null)
  const [error, setError] = useState('')
  const focusId = params.get('id') || offerId

  const load = useCallback(() => {
    Promise.all([api.offers.mine(), api.offers.received()])
      .then(([m, r]) => { setBuying(m); setSelling(r) })
      .catch(e => setError(e.message || 'Could not load offers.'))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (focusId && buying) document.getElementById(`offer-${focusId}`)?.scrollIntoView({ block: 'center' })
  }, [focusId, buying])

  if (listingId) return <Navigate to={`/listing/${listingId}?offer=1`} replace />

  const requested = params.get('tab')
  let tab = requested === 'selling' || requested === 'buying' ? requested : null
  if (!tab && focusId && selling?.some(o => o.id === focusId)) tab = 'selling'
  if (!tab) tab = buying && selling && buying.length === 0 && selling.length > 0 ? 'selling' : 'buying'
  const items = (tab === 'buying' ? buying : selling) || []
  const turn = (list, side) => (list || []).some(o => ['pending', 'countered'].includes(o.status) && o.current_offer_by !== side)

  return (
    <>
      <section className="page-intro">
        <div className="container">
          <p className="eyebrow">Negotiate direct</p>
          <h1>Offers and negotiations</h1>
          <p className="muted">Make offers, counter-offers and agree on price and terms directly with the other side. Every step is kept in one timeline.</p>
        </div>
      </section>
      <div className="container offers-page">
        <div className="seg-tabs" role="tablist" aria-label="Which offers">
          <button role="tab" className={`seg-tab ${turn(buying, 'buyer') ? 'has-turn' : ''}`} aria-selected={tab === 'buying'} onClick={() => setParams({ tab: 'buying' })}>Offers I&apos;ve made <span className="seg-count">{buying?.length ? `(${buying.length})` : ''}</span></button>
          <button role="tab" className={`seg-tab ${turn(selling, 'seller') ? 'has-turn' : ''}`} aria-selected={tab === 'selling'} onClick={() => setParams({ tab: 'selling' })}>Offers on my listings <span className="seg-count">{selling?.length ? `(${selling.length})` : ''}</span></button>
        </div>
        <section className="how-negotiate" aria-labelledby="howNegTitle">
          <h2 id="howNegTitle">How negotiating works on Houzeey</h2>
          <ol>
            <li><b>Make an offer.</b> On any home for sale, tap <em>Make an offer</em> and set your price, deposit, settlement date and conditions.</li>
            <li><b>The owner replies.</b> They can accept, decline or send a counter-offer.</li>
            <li><b>Go back and forth.</b> Counter, add messages or withdraw. Every step is saved in one timeline.</li>
            <li><b>Agree.</b> Once someone accepts, the home shows &quot;Under offer&quot;.</li>
            <li><b>Hand over to your solicitors.</b> Both sides add their solicitor or conveyancer and Houzeey emails them the deal. They handle identity checks, anti-money-laundering checks, disclosure, the contract and settlement, and you follow each step on a checklist.</li>
          </ol>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        {buying === null ? <p className="muted">Loading offers…</p> : (
          <div className="offer-list">
            {items.map(o => <OfferCard key={o.id} offer={o} tab={tab} focus={o.id === focusId} onChanged={load} />)}
          </div>
        )}
        {buying !== null && !items.length && (
          <div className="empty">
            {tab === 'buying'
              ? <><h2>You haven&apos;t made any offers yet</h2><p>Open any property for sale and choose <strong>Make an offer</strong>.</p><Link className="btn btn-primary" to="/buy">Browse properties</Link></>
              : <><h2>No offers on your listings yet</h2><p>When buyers make offers they&apos;ll appear here for you to accept, counter or decline.</p><Link className="btn btn-primary" to="/sell">List your property</Link></>}
          </div>
        )}
      </div>
    </>
  )
}
