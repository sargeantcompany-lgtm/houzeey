import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { canOffer, useAutoplay, useLike } from '../craft/Post'
import { Avatar, HouseArt, Icon, fullAddress, hueFor, listingImages, priceText, shareListing, toggleSave, useSaved } from '../craft/ui'

function Reel({ post, saved }) {
  const navigate = useNavigate()
  const ref = useRef(null)
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [frame, setFrame] = useState(0)
  const [active, setActive] = useState(false)
  const { liked, count, setLike } = useLike(post)
  useAutoplay(videoRef)
  const imgs = listingImages(post)
  const frames = imgs.length ? imgs : [0, 40, 80]

  // Photo tours: slow pan and fade between photos while the reel is on screen.
  useEffect(() => {
    const el = ref.current
    if (!el || post.video || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([en]) => setActive(en.isIntersecting && en.intersectionRatio > 0.6), { threshold: [0.6] })
    io.observe(el)
    return () => io.disconnect()
  }, [post.video])
  useEffect(() => {
    if (!active || frames.length < 2) return
    const t = setInterval(() => setFrame(f => (f + 1) % frames.length), 3500)
    return () => clearInterval(t)
  }, [active, frames.length])

  const chip = post.status === 'under_offer' ? 'Under offer' : 'For sale'
  return (
    <section className="reel" ref={ref} aria-label={fullAddress(post)}>
      <div className="reel-media" onDoubleClick={() => setLike(true)}>
        {post.video
          ? <div className="has-video"><video ref={videoRef} src={post.video.url} poster={post.video.thumbnailUrl} muted={muted} loop playsInline preload="metadata" /></div>
          : <div className="kb-wrap">{frames.map((f, i) => (
            <div key={i} className={`kb ${i === frame ? 'is-on' : ''}`}>
              {typeof f === 'string' ? <img src={f} alt="" /> : <HouseArt hue={(hueFor(post.id) + f) % 360} type={post.property_type} />}
            </div>
          ))}</div>}
      </div>
      <div className="reel-shade" aria-hidden="true" />
      <span className="reel-tag">{post.video ? '▶ Video tour' : 'Photo tour'}</span>
      {post.video && <button className={`sound-btn reel-sound ${muted ? 'is-muted' : ''}`} onClick={() => { setMuted(m => !m); videoRef.current?.play().catch(() => {}) }} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}><Icon.sound /></button>}
      <div className="reel-side">
        <button className={`ract like ${liked ? 'is-on' : ''}`} aria-pressed={liked} aria-label="Like" onClick={() => setLike(!liked)}><Icon.heart size={32} /><span>{count.toLocaleString('en-AU')}</span></button>
        <Link className="ract" to={`/listing/${post.id}#comments`} aria-label="Comments"><Icon.comment /><span>{post.comment_count || 0}</span></Link>
        <button className="ract" aria-label="Share" onClick={() => shareListing(post)}><Icon.share /><span>Share</span></button>
        <button className={`ract save ${saved ? 'is-saved' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save property'} onClick={() => toggleSave(post.id, navigate)}><Icon.bookmark /><span>Save</span></button>
      </div>
      <div className="reel-info">
        <div className="reel-who"><Avatar name={post.seller_name} id={post.user_id || post.id} /><strong>{post.seller_name}</strong><span className="reel-chip">{chip}</span></div>
        <p className="reel-price">{priceText(post)}</p>
        <p className="reel-addr">{fullAddress(post)}</p>
        <p className="reel-cap">{post.title}</p>
        <div className="reel-ctas">
          <Link className="btn btn-primary btn-sm" to={canOffer(post) ? `/listing/${post.id}?offer=1` : `/listing/${post.id}`}>{canOffer(post) ? 'Make an offer' : 'View home'}</Link>
          <Link className="btn btn-glass btn-sm" to={`/listing/${post.id}`}>Details</Link>
        </div>
      </div>
    </section>
  )
}

export default function Tours() {
  const saved = useSaved()
  const [posts, setPosts] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => { api.social.feed({ limit: 30 }).then(d => setPosts(d.posts)).catch(() => setPosts([])) }, [])
  useEffect(() => {
    const key = e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (e.target.closest?.('input, textarea, select')) return
      e.preventDefault()
      rootRef.current?.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * rootRef.current.clientHeight, behavior: 'smooth' })
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])

  return (
    <>
      <h1 className="visually-hidden">Video and photo tours</h1>
      <div className="reels" ref={rootRef} aria-label="Property tours. Scroll for the next home.">
        {posts === null && <section className="reel reel-end"><div><p>Loading tours…</p></div></section>}
        {posts?.map(p => <Reel key={p.id} post={p} saved={saved.has(p.id)} />)}
        <section className="reel reel-end">
          <div>
            <h2>Got a home to sell?</h2>
            <p>Film a 60-second walk-through on your phone and post it here. Buyers can like, comment and make offers straight from your video.</p>
            <Link className="btn btn-primary" to="/sell?step=media">Post your video tour</Link>
          </div>
        </section>
      </div>
    </>
  )
}
