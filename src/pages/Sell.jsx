import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { getVideoMimeType, MAX_VIDEO_UPLOAD_BYTES } from '../videoUpload'
import { ListingCard, typeLabel } from '../craft/ui'

const STEPS = ['Address & details', 'Photos & video', 'Price', 'Your solicitor', 'Review']
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const FEATURES = ['Air conditioning', 'Built-in wardrobes', 'Dishwasher', 'Solar panels', 'Swimming pool', 'Garden', 'Balcony', 'Study', 'Ensuite', 'Waterfront']
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTOS = 20

export default function Sell() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const videoFirst = params.get('step') === 'media'
  const [step, setStep] = useState(0)
  const [photos, setPhotos] = useState([])
  const [video, setVideo] = useState(null)
  const [createdListingId, setCreatedListingId] = useState(null)
  const [form, setForm] = useState({
    address: '', suburb: '', state: 'NSW', postcode: '', propertyType: 'house',
    beds: '3', baths: '2', cars: '1', size: '', headline: '', description: '',
    price: '', priceMax: '', priceDisplay: 'exact', features: [],
    solicitor_name: '', solicitor_firm: '', solicitor_email: '', solicitor_phone: '',
    solicitor_registration_number: '', solicitor_state: 'NSW', confirm: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(user => setIdentityVerified(Boolean(user.verified)))
      .catch(() => setIdentityVerified(false))
      .finally(() => setCheckingIdentity(false))
  }, [])
  useEffect(() => () => { photos.forEach(p => URL.revokeObjectURL(p.url)); if (video) URL.revokeObjectURL(video.url) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }
  const toggleFeature = feature => setForm(f => ({ ...f, features: f.features.includes(feature) ? f.features.filter(x => x !== feature) : [...f.features, feature] }))

  function addPhotos(files) {
    const list = Array.from(files || [])
    const ok = list.filter(f => PHOTO_TYPES.includes(f.type))
    const room = MAX_PHOTOS - photos.length
    if (ok.length < list.length) setError('Some files were skipped. Use JPEG, PNG or WebP photos (on iPhone, choose "Most Compatible" in Camera settings).')
    else if (ok.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`)
    else setError('')
    setPhotos(p => [...p, ...ok.slice(0, Math.max(0, room)).map(file => ({ file, url: URL.createObjectURL(file) }))])
  }
  function removePhoto(i) { setPhotos(p => { URL.revokeObjectURL(p[i].url); return p.filter((_, k) => k !== i) }) }
  function makeCover(i) { setPhotos(p => [p[i], ...p.filter((_, k) => k !== i)]) }
  function pickVideo(file) {
    if (!file) return
    if (!getVideoMimeType(file)) { setError('Choose an MP4, MOV, M4V or WebM video.'); return }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) { setError('Choose a video smaller than 512 MB.'); return }
    if (video) URL.revokeObjectURL(video.url)
    setVideo({ file, url: URL.createObjectURL(file) }); setError('')
  }

  const autoTitle = `${form.beds && !['land', 'rural'].includes(form.propertyType) ? `${form.beds} bedroom ` : ''}${typeLabel(form.propertyType).toLowerCase()} in ${form.suburb || 'your suburb'}`
  const preview = useMemo(() => ({
    id: 'preview', address: form.address || 'Your street address', suburb: form.suburb || 'Suburb', state: form.state, postcode: form.postcode,
    property_type: form.propertyType, beds: form.beds, baths: form.baths, cars: form.cars, land_size: form.size,
    price: form.price, price_max: form.priceMax, price_display: form.priceDisplay, status: 'active',
    primary_image: photos[0]?.url, seller_name: 'you',
  }), [form, photos])

  function validate() {
    if (step === 0 && (!form.address.trim() || !form.suburb.trim() || !/^\d{4}$/.test(form.postcode.trim()))) return 'Enter the street address, suburb and a 4-digit postcode.'
    if (step === 2) {
      if (form.priceDisplay !== 'contact' && !(Number(form.price) > 0)) return 'Enter an asking price, or choose "Contact owner".'
      if (form.priceDisplay === 'range' && !(Number(form.priceMax) > Number(form.price))) return 'The top of your price range must be higher than the bottom.'
      if (form.description.trim().length < 40) return 'Describe your home in at least a couple of sentences (40 characters).'
    }
    if (step === 3 && (!form.solicitor_name.trim() || !form.solicitor_firm.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.solicitor_email.trim()) || !form.solicitor_registration_number.trim())) {
      return "Add your solicitor or conveyancer's name, firm, work email and registration number."
    }
    if (step === 4 && !form.confirm) return 'Confirm that you own the property or are authorised to sell it.'
    return ''
  }

  function goNext() {
    const problem = validate()
    if (problem) { setError(problem); return }
    setError('')
    if (step < STEPS.length - 1) { setStep(s => s + 1); window.scrollTo(0, 0); return }
    submit()
  }

  async function submit() {
    setSubmitting(true); setError('')
    let listingCreated = Boolean(createdListingId)
    try {
      let listingId = createdListingId
      if (!listingId) {
        const fd = new FormData()
        fd.append('type', 'sale')
        fd.append('property_type', form.propertyType)
        fd.append('title', (form.headline.trim() || autoTitle).slice(0, 120))
        fd.append('address', form.address.trim())
        fd.append('suburb', form.suburb.trim())
        fd.append('state', form.state)
        fd.append('postcode', form.postcode.trim())
        if (form.beds !== '') fd.append('beds', form.beds)
        if (form.baths !== '') fd.append('baths', form.baths)
        if (form.cars !== '') fd.append('cars', form.cars)
        if (form.size) fd.append('land_size', form.size)
        fd.append('description', form.description.trim())
        fd.append('price', form.priceDisplay === 'contact' && !form.price ? '0' : form.price)
        fd.append('price_display', form.priceDisplay)
        if (form.priceDisplay === 'range') fd.append('price_max', form.priceMax)
        form.features.forEach(f => fd.append('features', f))
        for (const key of ['solicitor_name', 'solicitor_firm', 'solicitor_email', 'solicitor_phone', 'solicitor_registration_number', 'solicitor_state']) fd.append(key, form[key])
        photos.forEach(p => fd.append('images', p.file, p.file.name || 'photo.jpg'))
        setUploadMessage('Sending your listing…')
        const listing = await api.listings.create(fd)
        listingId = listing.id
        listingCreated = true
        setCreatedListingId(listingId)
      }
      if (video) {
        const contentType = getVideoMimeType(video.file)
        setUploadProgress(0)
        setUploadMessage('Preparing video upload…')
        const upload = await api.videos.createUploadUrl(listingId, { contentType, fileSize: video.file.size })
        setUploadMessage('Uploading video…')
        await api.videos.uploadDirect(upload.uploadUrl, video.file, contentType, setUploadProgress)
        setUploadMessage('Starting video processing…')
        await api.videos.completeUpload(upload.videoId)
      }
      navigate('/my-listings', { state: { listingSubmitted: true } })
    } catch (err) {
      setError(listingCreated
        ? `Your listing was sent for solicitor review, but the video upload didn't finish (${err.message}). Choose "Retry video upload".`
        : err.message || 'Could not submit your listing. Please try again.')
      setSubmitting(false)
      setUploadMessage('')
    }
  }

  const priceLine = form.priceDisplay === 'contact' ? 'Contact owner'
    : form.priceDisplay === 'range' ? `$${Number(form.price || 0).toLocaleString('en-AU')} – $${Number(form.priceMax || 0).toLocaleString('en-AU')}`
      : `$${Number(form.price || 0).toLocaleString('en-AU')}`

  return (
    <>
      <section className="page-intro">
        <div className="container">
          <p className="eyebrow">List your property · Private sale</p>
          <h1>Sell your property yourself</h1>
          <p className="muted">Free to list. Your solicitor or conveyancer reviews the details, then your home goes live.</p>
        </div>
      </section>

      {checkingIdentity ? <div className="container" style={{ padding: '40px 24px' }}><p className="muted">Checking your account…</p></div> : !identityVerified ? (
        <div className="container" style={{ padding: '40px 24px 64px', maxWidth: 720 }}>
          <div className="how-negotiate">
            <h2>First, verify your identity</h2>
            <p>Every seller on Houzeey verifies their identity before listing. It only takes a few minutes and keeps buyers safe from fake listings.</p>
            <div className="row-actions"><Link className="btn btn-primary" to="/verify-identity">Verify my identity</Link><Link className="btn btn-outline" to="/guides">How selling works</Link></div>
          </div>
        </div>
      ) : (
        <div className="container sell-layout">
          <ol className="stepper" aria-label="Listing steps">
            {STEPS.map((s, i) => (
              <li key={s} className={`${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''} ${videoFirst && i === 1 && step < 1 ? 'is-highlight' : ''}`}>
                <span>{i < step ? '✓' : i + 1}</span>{s}
              </li>
            ))}
          </ol>

          <form className="sell-form" noValidate onSubmit={e => { e.preventDefault(); goNext() }}>
            {videoFirst && step === 0 && <p className="video-callout"><strong>Posting a video tour?</strong> Fill in the address first, then add your video in step 2.</p>}

            {step === 0 && (
              <fieldset className="step">
                <legend>Where is the property?</legend>
                <div className="field-grid">
                  <label className="field span-2"><span>Street address</span><input name="address" value={form.address} onChange={set} placeholder="e.g. 12 Banksia Street" autoComplete="street-address" required /></label>
                  <label className="field"><span>Suburb</span><input name="suburb" value={form.suburb} onChange={set} autoComplete="address-level2" required /></label>
                  <label className="field"><span>State</span><select name="state" value={form.state} onChange={set}>{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
                  <label className="field"><span>Postcode</span><input name="postcode" value={form.postcode} onChange={set} inputMode="numeric" maxLength={4} autoComplete="postal-code" required /></label>
                  <label className="field"><span>Property type</span>
                    <select name="propertyType" value={form.propertyType} onChange={set}>
                      {['house', 'apartment', 'townhouse', 'unit', 'land', 'rural'].map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Bedrooms</span><input name="beds" type="number" min="0" max="20" value={form.beds} onChange={set} /></label>
                  <label className="field"><span>Bathrooms</span><input name="baths" type="number" min="0" max="20" value={form.baths} onChange={set} /></label>
                  <label className="field"><span>Car spaces</span><input name="cars" type="number" min="0" max="20" value={form.cars} onChange={set} /></label>
                  <label className="field"><span>Land size (m²)</span><input name="size" type="number" min="0" inputMode="numeric" value={form.size} onChange={set} /></label>
                </div>
                <fieldset className="checks checks-grid">
                  <legend>Features</legend>
                  {FEATURES.map(f => <label key={f}><input type="checkbox" checked={form.features.includes(f)} onChange={() => toggleFeature(f)} /> {f}</label>)}
                </fieldset>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="step">
                <legend>Photos and video</legend>
                <p className="muted">Add up to {MAX_PHOTOS} photos. The first one is the cover. Landscape photos look best. Without photos we&apos;ll show an illustration.</p>
                <label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
                  <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <strong>Choose photos</strong>
                  <span className="muted">or drag them here</span>
                </label>
                {photos.length > 0 && (
                  <ul className="photo-list">
                    {photos.map((p, i) => (
                      <li key={p.url}>
                        <img src={p.url} alt={`Photo ${i + 1}`} />
                        <button type="button" className="icon-btn remove" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
                        {i === 0 ? <span className="cover-tag">Cover</span> : <button type="button" className="mini" onClick={() => makeCover(i)}>Make cover</button>}
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="video-title">Video tour <span className="muted">(optional, recommended)</span></h3>
                <p className="muted">Walk buyers through your home in a short vertical video (under 2 minutes works best). It plays in the feed and in Tours, just like a reel.</p>
                <div className="video-pick">
                  <label className="btn btn-outline">
                    <input type="file" accept="video/*" className="visually-hidden" onChange={e => { pickVideo(e.target.files?.[0]); e.target.value = '' }} />
                    Upload a video
                  </label>
                  <label className="btn btn-outline record-btn">
                    <input type="file" accept="video/*" capture="environment" className="visually-hidden" onChange={e => { pickVideo(e.target.files?.[0]); e.target.value = '' }} />
                    Record with camera
                  </label>
                </div>
                {video && (
                  <div className="video-preview">
                    <video src={video.url} controls playsInline muted />
                    <div className="video-preview-info">
                      <strong>{video.file.name}</strong>
                      <span className="muted">{(video.file.size / 1048576).toFixed(1)} MB</span>
                      <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => { URL.revokeObjectURL(video.url); setVideo(null) }}>Remove video</button>
                    </div>
                  </div>
                )}
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="step">
                <legend>Price and description</legend>
                <div className="field-grid">
                  <label className="field"><span>{form.priceDisplay === 'range' ? 'Price from ($)' : 'Asking price ($)'}</span><input name="price" type="number" min="0" step="1" inputMode="numeric" value={form.price} onChange={set} /></label>
                  <label className="field"><span>Price shown to buyers</span>
                    <select name="priceDisplay" value={form.priceDisplay} onChange={set}>
                      <option value="exact">Show the exact price</option>
                      <option value="range">Show a price range</option>
                      <option value="contact">&quot;Contact owner&quot;</option>
                    </select>
                  </label>
                  {form.priceDisplay === 'range' && <label className="field"><span>Price to ($)</span><input name="priceMax" type="number" min="0" step="1" inputMode="numeric" value={form.priceMax} onChange={set} /></label>}
                  <label className="field span-2"><span>Headline</span><input name="headline" value={form.headline} onChange={set} maxLength={80} placeholder="e.g. Sunny family home close to schools" /></label>
                  <label className="field span-2"><span>Description</span><textarea name="description" rows={6} value={form.description} onChange={set} placeholder="Describe the layout, recent updates, the street and what's nearby." /></label>
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="step">
                <legend>Your solicitor or conveyancer</legend>
                <p className="muted">We email them a secure link to check your listing details. They also confirm they&apos;ve done your identity and anti-money-laundering (AML) checks and that the seller disclosure is prepared. Your listing goes live once they approve it.</p>
                <div className="field-grid">
                  <label className="field"><span>Full name</span><input name="solicitor_name" value={form.solicitor_name} onChange={set} /></label>
                  <label className="field"><span>Firm</span><input name="solicitor_firm" value={form.solicitor_firm} onChange={set} /></label>
                  <label className="field span-2"><span>Work email</span><input name="solicitor_email" type="email" value={form.solicitor_email} onChange={set} placeholder="name@lawfirm.com.au" /></label>
                  <label className="field"><span>Phone (optional)</span><input name="solicitor_phone" type="tel" value={form.solicitor_phone} onChange={set} /></label>
                  <label className="field"><span>Registration number</span><input name="solicitor_registration_number" value={form.solicitor_registration_number} onChange={set} /></label>
                  <label className="field"><span>Registered in</span><select name="solicitor_state" value={form.solicitor_state} onChange={set}>{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
                </div>
                <p className="muted small-print">Houzeey records your solicitor&apos;s response but doesn&apos;t independently verify their registration.</p>
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="step">
                <legend>Check and send for review</legend>
                <div className="sell-preview"><ListingCard listing={preview} saved={false} onToggleSave={() => {}} /></div>
                <p className="muted" style={{ marginTop: 16 }}>
                  <strong>{form.headline.trim() || autoTitle}</strong><br />
                  {priceLine} · {photos.length} photo{photos.length === 1 ? '' : 's'}{video ? ' · video tour' : ''}{form.features.length ? ` · ${form.features.length} features` : ''}<br />
                  Solicitor: {form.solicitor_name} · {form.solicitor_firm}
                </p>
                <label className="check-line"><input type="checkbox" name="confirm" checked={form.confirm} onChange={set} /> I own this property (or am authorised to sell it) and the details are accurate.</label>
                {uploadMessage && <p className="offer-hint" role="status" aria-live="polite">{uploadMessage}{uploadMessage === 'Uploading video…' ? ` ${uploadProgress}%` : ''}</p>}
              </fieldset>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="step-nav">
              {step > 0 && <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep(s => s - 1) }} disabled={submitting || Boolean(createdListingId)}>Back</button>}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (uploadMessage === 'Uploading video…' ? `Uploading video… ${uploadProgress}%` : uploadMessage || 'Sending…')
                  : createdListingId ? 'Retry video upload'
                    : step === STEPS.length - 1 ? 'Send for solicitor review' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
