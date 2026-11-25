import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import Post from '../craft/Post'
import { Avatar, HouseArt, Icon, STATES, hueFor, listingImages, money, priceText, timeAgo, useSaved } from '../craft/ui'

function StoryViewer({ stories, start, onClose }) {
  const [index, setIndex] = useState(start)
  const [slide, setSlide] = useState(0)
  const l = stories[index]
  const imgs = listingImages(l)
  const slides = imgs.length ? imgs.slice(0, 4) : [null, null]

  useEffect(() => {
    const t = setTimeout(() => {
      if (slide < slides.length - 1) setSlide(s => s + 1)
      else if (index < stories.length - 1) { setIndex(i => i + 1); setSlide(0) }
      else onClose()
    }, 5000)
    return () => clearTimeout(t)
  }, [index, slide, slides.length, stories.length, onClose])
  function next() { if (slide < slides.length - 1) setSlide(s => s + 1); else if (index < stories.length - 1) { setIndex(i => i + 1); setSlide(0) } else onClose() }
  function prev() { if (slide > 0) setSlide(s => s - 1); else if (index > 0) { setIndex(i => i - 1); setSlide(0) } }
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', key)
    document.body.classList.add('no-scroll')
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('no-scroll') }
  })

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label="New listing story" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="story-frame">
        <div className="story-bars">{slides.map((_, k) => <span key={k} className={k < slide ? 'done' : ''}><i key={`${index}-${slide}`} className={k === slide ? 'run' : ''} /></span>)}</div>
        <div className="story-top">
          <Avatar name={l.seller_name} id={l.user_id || l.id} />
          <div className="story-who"><strong>{l.seller_name}</strong><span>{l.suburb}, {l.state} · {timeAgo(l.created_at)}</span></div>
          <button className="icon-btn story-close" onClick={onClose} aria-label="Close story"><Icon.close /></button>
        </div>
        <div className="story-media">{slides[slide] ? <img src={slides[slide]} alt="" /> : <HouseArt hue={(hueFor(l.id) + slide * 60) % 360} type={l.property_type} />}</div>
        <button className="story-nav prev" onClick={prev} aria-label="Previous" />
        <button className="story-nav next" onClick={next} aria-label="Next" />
        <div className="story-bottom">
          <p className="story-price">{priceText(l)}</p>
          <p className="story-text">{l.title}</p>
          <Link className="btn btn-primary btn-block" to={l.status === 'active' ? `/listing/${l.id}?offer=1` : `/listing/${l.id}`}>
            {l.status === 'active' ? 'View home and make an offer' : 'View home'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const session = getSession()
  const saved = useSaved()
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [states, setStates] = useState({})
  const [calc, setCalc] = useState(900000)
  const [story, setStory] = useState(null)
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const loadingMore = useRef(false)

  useEffect(() => {
    let live = true
    setLoading(true); setError('')
    api.social.feed({ filter, limit: 12 })
      .then(d => { if (live) { setPosts(d.posts); setHasMore(d.hasMore) } })
      .catch(e => live && setError(e.message || 'Could not load the feed.'))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [filter])
  useEffect(() => { api.social.states().then(setStates).catch(() => {}) }, [])
  useEffect(() => {
    if (!session?.id) return
    Promise.all([api.listings.mine(), api.offers.mine(), api.offers.received()])
      .then(([mine, made, received]) => {
        const waiting = o => ['pending', 'countered'].includes(o.status)
        setStats({
          listings: mine.length,
          offers: made.filter(o => waiting(o) && o.current_offer_by === 'seller').length + received.filter(o => waiting(o) && o.current_offer_by === 'buyer').length,
        })
      }).catch(() => {})
  }, [session?.id])

  async function loadMore() {
    if (loadingMore.current) return
    loadingMore.current = true
    try {
      const d = await api.social.feed({ filter, limit: 12, offset: posts.length })
      setPosts(p => [...p, ...d.posts]); setHasMore(d.hasMore)
    } finally { loadingMore.current = false }
  }

  const stories = posts.filter(p => p.status !== 'sold').slice(0, 14)

  return (
    <div className="container feed-layout">
      <div className="feed-col">
        <section className="feed-intro">
          <h1 className="feed-title">Find a home. <em>Deal direct.</em></h1>
          <p className="muted">Homes posted by the people who own them. Scroll, like, comment and make an offer, with no agent in between.</p>
        </section>

        <form className="feed-search" role="search" onSubmit={e => { e.preventDefault(); navigate(`/buy${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`) }}>
          <div className="search-input-wrap">
            <Icon.search />
            <input value={query} onChange={e => setQuery(e.target.value)} type="search" placeholder="Search suburb, postcode or state" aria-label="Search suburb, postcode or state" />
          </div>
          <button className="btn btn-primary" type="submit">Search</button>
        </form>

        <div className="feature-duo">
          <Link className="feature-card fc-video" to="/sell?step=media">
            <span className="fc-icon" aria-hidden="true"><Icon.video size={28} /></span>
            <span className="fc-text"><strong>Post a video tour</strong><span>Film your home on your phone or upload a video. It plays like a reel in the feed and in Tours.</span></span>
            <span className="fc-go" aria-hidden="true">→</span>
          </Link>
          <Link className="feature-card fc-offer" to="/offers">
            <span className="fc-icon" aria-hidden="true"><Icon.tag /></span>
            <span className="fc-text"><strong>Negotiate offers directly</strong><span>Make an offer, counter, accept or decline, with price, deposit, settlement and conditions in one timeline.</span></span>
            <span className="fc-go" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="stories" aria-label="New listings">
          <Link className="story add-story" to="/sell"><span className="story-ring"><span className="story-pic plus">+</span></span><span className="story-label">Post yours</span></Link>
          {stories.map((l, i) => (
            <button key={l.id} className="story" onClick={() => setStory(i)}>
              <span className="story-ring">
                <span className="story-pic">{listingImages(l)[0] ? <img src={listingImages(l)[0]} alt="" /> : <HouseArt hue={hueFor(l.id)} type={l.property_type} />}</span>
                {l.video && <span className="story-vid">▶</span>}
              </span>
              <span className="story-label">{l.suburb}</span>
            </button>
          ))}
        </div>

        <div className="chips" role="tablist" aria-label="Show">
          {[['all', 'All'], ['video', 'Video tours']].map(([key, label]) => (
            <button key={key} className={`chip ${filter === key ? 'is-on' : ''}`} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}>{label}</button>
          ))}
          <Link className="chip" to="/buy">Browse all homes</Link>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading homes…</p> : (
          <div className="feed" aria-live="polite">
            {posts.map(p => <Post key={p.id} post={p} saved={saved.has(p.id)} />)}
          </div>
        )}
        {!loading && !posts.length && !error && (
          <div className="empty feed-empty">
            <h2>{filter === 'video' ? 'No video tours yet' : 'No homes yet'}</h2>
            <p>Be the first: post your home with a short video walk-through.</p>
            <Link className="btn btn-primary" to="/sell">Post your property</Link>
          </div>
        )}
        {hasMore && <div style={{ textAlign: 'center', marginTop: 24 }}><button className="btn btn-outline" onClick={loadMore}>Show more homes</button></div>}
      </div>

      <aside className="feed-side" aria-label="Your account and tips">
        <div className="side-card">
          {session ? (
            <>
              <div className="me-row"><Avatar name={session.name} id={session.id} /><div><strong>{session.name}</strong><span className="muted">{session.email}</span></div></div>
              <div className="me-stats">
                <Link to="/my-listings"><b>{stats?.listings ?? '–'}</b> listings</Link>
                <Link to="/offers"><b>{stats?.offers ?? '–'}</b> offers waiting</Link>
                <Link to="/saved"><b>{saved.size}</b> saved</Link>
              </div>
            </>
          ) : (
            <>
              <h2>Join Houzeey</h2>
              <p className="muted">Like and comment on homes, make offers and post your own property.</p>
              <div className="row-actions"><Link className="btn btn-primary btn-sm" to="/register">Join</Link><Link className="btn btn-outline btn-sm" to="/login">Sign in</Link></div>
            </>
          )}
        </div>
        <div className="side-card side-sell">
          <h2>Sell it yourself, keep the commission</h2>
          <label className="field"><span>Your expected sale price</span>
            <input type="range" min="200000" max="3000000" step="10000" value={calc} onChange={e => setCalc(Number(e.target.value))} />
          </label>
          <p className="side-calc">{money(calc)} home: keep about <strong>{money(calc * 0.022 + 3500)}</strong></p>
          <p className="muted small-note">Typical 2.2% agent fee plus a $3,500 marketing package.</p>
          <Link className="btn btn-primary btn-block" to="/sell">Post your property</Link>
        </div>
        <div className="side-card">
          <h2>How it works</h2>
          <ol className="mini-steps">
            <li><b>Post</b> photos and a video tour of your home.</li>
            <li><b>Chat</b> with buyers and take offers in one place.</li>
            <li><b>Agree</b> a price, then hand over to your solicitors.</li>
          </ol>
          <Link className="link-arrow" to="/guides">Selling guides</Link>
        </div>
        <div className="side-card">
          <h2>Explore by state</h2>
          <div className="state-chips">
            {STATES.map(s => <Link key={s.code} className="chip" to={`/buy?state=${s.code}`}>{s.code} <span>{states[s.code] || 0}</span></Link>)}
          </div>
        </div>
      </aside>

      {story != null && stories[story] && <StoryViewer stories={stories} start={story} onClose={() => setStory(null)} />}
    </div>
  )
}
