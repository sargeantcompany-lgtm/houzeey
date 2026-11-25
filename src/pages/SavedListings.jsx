import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ListingCard, toggleSave, useSaved } from '../craft/ui'

export default function SavedListings() {
  const navigate = useNavigate()
  const saved = useSaved()
  const [listings, setListings] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { api.saved.list().then(setListings).catch(e => { setListings([]); setError(e.message) }) }, [])
  const shown = (listings || []).filter(l => saved.has(l.id))

  return (
    <>
      <section className="page-intro">
        <div className="container">
          <h1>Saved properties</h1>
          <p className="muted">Tap the heart on any property to keep it here.</p>
        </div>
      </section>
      <div className="container">
        {error && <p className="form-error" role="alert">{error}</p>}
        {listings === null ? <p className="muted" style={{ padding: '32px 0' }}>Loading…</p> : shown.length ? (
          <div className="result-grid" id="savedGrid">
            {shown.map(l => <ListingCard key={l.id} listing={l} saved onToggleSave={id => toggleSave(id, navigate)} />)}
          </div>
        ) : (
          <div className="empty">
            <h2>Nothing saved yet</h2>
            <p>Browse properties and save the ones you like.</p>
            <Link className="btn btn-primary" to="/buy">Browse properties</Link>
          </div>
        )}
      </div>
    </>
  )
}
