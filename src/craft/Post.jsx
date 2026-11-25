/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession, isLoggedIn } from '../auth'
import { Avatar, FeatureLine, HouseArt, Icon, fullAddress, hueFor, listingImages, priceText, shareListing, timeAgo, toast, toggleSave } from './ui'

// Plays a muted video only while it is mostly on screen.
export function useAutoplay(ref) {
  useEffect(() => {
    const v = ref.current
    if (!v || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio > 0.6) v.play().catch(() => {})
      else v.pause()
    }, { threshold: [0, 0.6, 1] })
    io.observe(v)
    return () => io.disconnect()
  }, [ref])
}

export function useLike(post) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(!!post.liked)
  const [count, setCount] = useState(post.like_count || 0)
  async function setLike(on) {
    if (!isLoggedIn()) { toast('Join or sign in to like homes'); navigate('/login'); return }
    if (on === liked) return
    setLiked(on); setCount(c => c + (on ? 1 : -1))
    try {
      const r = on ? await api.social.like(post.id) : await api.social.unlike(post.id)
      setLiked(r.liked); setCount(r.like_count)
    } catch (e) {
      setLiked(!on); setCount(c => c + (on ? -1 : 1)); toast(e.message)
    }
  }
  return { liked, count, setLike }
}

export function canOffer(l) {
  return l.status === 'active' && getSession()?.id !== l.user_id
}

export default function Post({ post, saved }) {
  const navigate = useNavigate()
  const images = listingImages(post)
  const slides = [
    ...(post.video ? [{ video: post.video }] : []),
    ...(images.length ? images.map(src => ({ img: src })) : [0, 40, 80].map(d => ({ art: d }))),
  ]
  const { liked, count, setLike } = useLike(post)
  const [slide, setSlide] = useState(0)
  const [muted, setMuted] = useState(true)
  const [showDesc, setShowDesc] = useState(false)
  const [comments, setComments] = useState(post.recent_comments || [])
  const [commentTotal, setCommentTotal] = useState(post.comment_count || 0)
  const [allShown, setAllShown] = useState(false)
  const [draft, setDraft] = useState('')
  const trackRef = useRef(null)
  const videoRef = useRef(null)
  const burstRef = useRef(null)
  const inputRef = useRef(null)
  useAutoplay(videoRef)

  const chip = post.status === 'under_offer' ? 'Under offer' : post.status === 'sold' ? 'Sold' : 'For sale'
  const go = dir => trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth, behavior: 'smooth' })

  function burst() {
    setLike(true)
    const b = burstRef.current
    if (b) { b.classList.remove('go'); void b.offsetWidth; b.classList.add('go') }
  }

  async function showAll() {
    try { setComments(await api.social.comments(post.id)); setAllShown(true) } catch (e) { toast(e.message) }
  }

  async function submitComment(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    if (!isLoggedIn()) { toast('Join or sign in to comment'); navigate('/login'); return }
    try {
      const c = await api.social.comment(post.id, text)
      setComments(list => [...list, c]); setCommentTotal(n => n + 1); setDraft('')
    } catch (err) { toast(err.message) }
  }

  return (
    <article className="post" data-id={post.id}>
      <header className="post-head">
        <Avatar name={post.seller_name} id={post.user_id || post.id} />
        <div className="post-who"><Link className="post-owner" to={`/listing/${post.id}`}>{post.seller_name}</Link><span className="post-loc">{post.suburb}, {post.state}</span></div>
        <span className={`post-chip ${post.status === 'sold' ? 'is-sold' : post.status === 'under_offer' ? 'is-offer' : ''}`}>{chip}</span>
      </header>
      <div className="post-media" onDoubleClick={burst}>
        <div className="post-track" ref={trackRef} onScroll={e => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {slides.map((s, i) => (
            <div key={i} className={`slide${s.video ? ' has-video' : ''}`}>
              {s.video && <><video ref={videoRef} src={s.video.url} poster={s.video.thumbnailUrl} muted={muted} loop playsInline preload="metadata" /><span className="video-chip">▶ Video tour</span></>}
              {s.img && <img src={s.img} alt={`Photo ${i + 1} of ${fullAddress(post)}`} loading="lazy" />}
              {s.art != null && <HouseArt hue={(hueFor(post.id) + s.art) % 360} type={post.property_type} />}
            </div>
          ))}
        </div>
        {slides.length > 1 && <>
          <button className="media-btn prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <button className="media-btn next" onClick={() => go(1)} aria-label="Next photo">›</button>
          <div className="media-dots" aria-hidden="true">{slides.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}</div>
        </>}
        {post.video && (
          <button className={`sound-btn ${muted ? 'is-muted' : ''}`} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            onClick={() => { setMuted(m => !m); videoRef.current?.play().catch(() => {}) }}><Icon.sound /></button>
        )}
        <span className="burst" ref={burstRef} aria-hidden="true"><Icon.heart size={96} /></span>
      </div>
      <div className="post-actions">
        <button className={`act like ${liked ? 'is-on' : ''}`} aria-pressed={liked} aria-label="Like" onClick={() => setLike(!liked)}><Icon.heart size={26} /></button>
        <button className="act" aria-label="Comment" onClick={() => inputRef.current?.focus()}><Icon.comment /></button>
        <button className="act" aria-label="Share" onClick={() => shareListing(post)}><Icon.share /></button>
        {canOffer(post) && <Link className="btn btn-primary btn-sm offer-pill" to={`/listing/${post.id}?offer=1`}>Make an offer</Link>}
        <button className={`act save ${saved ? 'is-saved' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save property'} onClick={() => toggleSave(post.id, navigate)}><Icon.bookmark /></button>
      </div>
      <p className="post-likes"><b>{count.toLocaleString('en-AU')}</b> {count === 1 ? 'like' : 'likes'}</p>
      <p className="post-price">{priceText(post)}</p>
      <FeatureLine listing={post} />
      <p className="post-caption">
        <b>{post.seller_name}</b> {post.title}
        {post.description && !showDesc && <> <button className="linkish more" onClick={() => setShowDesc(true)}>more</button></>}
        {showDesc && <span className="post-desc">{post.description}</span>}
      </p>
      {!allShown && commentTotal > comments.length && <button className="linkish view-all" onClick={showAll}>View all {commentTotal} comments</button>}
      <ul className="post-comments">{comments.map(c => <li key={c.id}><b>{c.name}</b> {c.body}</li>)}</ul>
      <time className="post-time">{timeAgo(post.created_at)}</time>
      <form className="comment-form" onSubmit={submitComment}>
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" maxLength={300} />
        <button className="linkish" type="submit">Post</button>
      </form>
    </article>
  )
}
