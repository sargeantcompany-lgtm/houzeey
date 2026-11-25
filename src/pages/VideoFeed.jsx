import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { isLoggedIn } from '../auth'
import './VideoFeed.css'

function formatPrice(listing) {
  if (listing.priceDisplay === 'contact' || listing.price == null || Number(listing.price) === 0) {
    return 'Price on request'
  }
  if (listing.priceDisplay === 'range' && listing.priceMax) {
    return `$${Number(listing.price).toLocaleString('en-AU')} – $${Number(listing.priceMax).toLocaleString('en-AU')}`
  }
  return `$${Number(listing.price).toLocaleString('en-AU')}`
}

function FeedFilterPanel({ filters, onApply, onClose }) {
  const [suburb, setSuburb] = useState(filters.suburb)
  const [minPrice, setMinPrice] = useState(filters.min_price)
  const [maxPrice, setMaxPrice] = useState(filters.max_price)
  const [error, setError] = useState('')

  function apply(event) {
    event.preventDefault()
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setError('Minimum price cannot exceed maximum price.')
      return
    }
    onApply({ suburb: suburb.trim(), min_price: minPrice, max_price: maxPrice })
  }

  function clear() {
    setSuburb('')
    setMinPrice('')
    setMaxPrice('')
    onApply({ suburb: '', min_price: '', max_price: '' })
  }

  return (
    <div className="reels-filter-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="reels-filter-panel" role="dialog" aria-modal="true" aria-labelledby="reels-filter-title">
        <div className="reels-filter-heading">
          <div>
            <span className="reels-kicker">Find your next move</span>
            <h2 id="reels-filter-title">Filter homes</h2>
          </div>
          <button type="button" className="reels-icon-button" onClick={onClose} aria-label="Close filters">×</button>
        </div>
        <form onSubmit={apply}>
          <label>
            Suburb or postcode
            <input value={suburb} onChange={event => setSuburb(event.target.value)} placeholder="e.g. Burleigh Heads" maxLength={100} />
          </label>
          <div className="reels-price-fields">
            <label>
              Min price
              <input type="number" min="0" step="10000" value={minPrice} onChange={event => setMinPrice(event.target.value)} placeholder="No minimum" />
            </label>
            <label>
              Max price
              <input type="number" min="0" step="10000" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder="No maximum" />
            </label>
          </div>
          {error && <p className="reels-filter-error" role="alert">{error}</p>}
          <div className="reels-filter-actions">
            <button type="button" className="reels-clear-button" onClick={clear}>Clear filters</button>
            <button type="submit" className="reels-apply-button">Show homes</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ReelCard({
  item,
  index,
  activeIndex,
  rootRef,
  saved,
  onSave,
  onActive,
  onInactive,
}) {
  const cardRef = useRef(null)
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playError, setPlayError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const isActive = index === activeIndex
  const shouldLoad = isActive || index === activeIndex + 1
  const listing = item.listing

  useEffect(() => {
    const node = cardRef.current
    if (!node || !rootRef.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      if (index === 0) onActive(0)
      return undefined
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.6) onActive(index)
        else if (entry.intersectionRatio < 0.1) onInactive(index)
      }
    }, { root: rootRef.current, threshold: [0, 0.1, 0.6] })
    observer.observe(node)
    return () => observer.disconnect()
  }, [index, onActive, onInactive, rootRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!isActive) {
      video.pause()
      return
    }
    const playRequest = video.play()
    if (playRequest) {
      playRequest.then(() => setPlayError(false)).catch(() => setPlayError(true))
    }
  }, [isActive, muted, item.videoUrl])

  function toggleMuted() {
    const video = videoRef.current
    const nextMuted = !muted
    if (video) video.muted = nextMuted
    setMuted(nextMuted)
  }

  function playVideo() {
    const playRequest = videoRef.current?.play()
    if (playRequest) playRequest.then(() => setPlayError(false)).catch(() => setPlayError(true))
  }

  const propertyFacts = [
    listing.beds != null && `${listing.beds} bed`,
    listing.baths != null && `${listing.baths} bath`,
    listing.cars != null && `${listing.cars} car`,
  ].filter(Boolean)

  return (
    <article className="reel-card" ref={cardRef} data-reel-index={index}>
      <div className="reel-video-frame">
        <video
          ref={videoRef}
          src={shouldLoad ? item.videoUrl : undefined}
          poster={item.thumbnailUrl}
          className="reel-video"
          playsInline
          muted={muted}
          loop
          preload={isActive ? 'auto' : shouldLoad ? 'metadata' : 'none'}
          onLoadStart={() => setVideoReady(false)}
          onCanPlay={() => {
            setVideoReady(true)
            setVideoError(false)
          }}
          onError={() => setVideoError(true)}
          aria-label={`Video tour: ${listing.title}`}
        />
        <div className="reel-shade" aria-hidden="true" />
        {isActive && !videoReady && !videoError && <div className="reel-loading-indicator" aria-hidden="true" />}
        {videoError && (
          <p className="reel-video-message" role="status">This video could not be played.</p>
        )}
        {playError && !videoError && (
          <button type="button" className="reel-play-button" onClick={playVideo}>Tap to play</button>
        )}

        <div className="reel-copy">
          <span className="reel-owner-label">Private sale · solicitor reviewed</span>
          <p className="reel-location">{[listing.suburb, listing.state, listing.postcode].filter(Boolean).join(' ')}</p>
          <p className="reel-price">{formatPrice(listing)}</p>
          <h2>{listing.title}</h2>
          {propertyFacts.length > 0 && <p className="reel-facts">{propertyFacts.join('  ·  ')}</p>}
          {listing.landSize != null && <p className="reel-land-size">{Number(listing.landSize).toLocaleString('en-AU')} m² land</p>}
        </div>

        <div className="reel-actions">
          <button
            type="button"
            className={`reel-action-button${saved ? ' is-saved' : ''}`}
            onClick={() => onSave(listing.id)}
            aria-label={saved ? 'Remove saved property' : 'Save property'}
          >
            <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
            <small>{saved ? 'Saved' : 'Save'}</small>
          </button>
          <button
            type="button"
            className="reel-action-button"
            onClick={toggleMuted}
            aria-label={muted ? 'Turn sound on' : 'Mute video'}
          >
            <span aria-hidden="true">{muted ? '♪' : '♫'}</span>
            <small>{muted ? 'Sound' : 'Mute'}</small>
          </button>
        </div>

        <Link to={`/listing/${listing.id}?contact=1`} className="reel-enquire-button">
          Enquire about this home <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

function FeedResults({ filters, savedIds, onSave }) {
  const scrollRef = useRef(null)
  const sentinelRef = useRef(null)
  const [items, setItems] = useState([])
  const [activeIndex, setActiveIndex] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [paginationError, setPaginationError] = useState('')

  useEffect(() => {
    let current = true
    api.videos.feed(filters)
      .then(page => {
        if (!current) return
        setItems(page.items || [])
        setCursor(page.nextCursor || null)
        setHasMore(Boolean(page.hasMore))
      })
      .catch(requestError => {
        if (current) setError(requestError.message || 'Could not load property videos.')
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => { current = false }
  }, [filters])

  const onActive = useCallback(index => setActiveIndex(index), [])
  const onInactive = useCallback(index => {
    setActiveIndex(current => current === index ? null : current)
  }, [])

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || loadingMore) return
    setLoadingMore(true)
    setPaginationError('')
    try {
      const page = await api.videos.feed({ ...filters, cursor })
      setItems(current => {
        const existingIds = new Set(current.map(item => item.id))
        return [...current, ...(page.items || []).filter(item => !existingIds.has(item.id))]
      })
      setCursor(page.nextCursor || null)
      setHasMore(Boolean(page.hasMore))
    } catch (requestError) {
      setPaginationError(requestError.message || 'Could not load more videos.')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, filters, hasMore, loadingMore])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !hasMore || loadingMore || paginationError || loading) return undefined

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore()
    }, { root, rootMargin: '100% 0px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, loadingMore, paginationError])

  if (loading) {
    return <div className="reels-status"><span className="reels-spinner" />Loading property videos…</div>
  }
  if (error) {
    return <div className="reels-status reels-status-error" role="alert">{error}</div>
  }
  if (!items.length) {
    return (
      <div className="reels-status">
        <span className="reels-empty-icon" aria-hidden="true">⌂</span>
        <h1>No videos match just yet</h1>
        <p>Try a different suburb or widen your price range.</p>
      </div>
    )
  }

  return (
    <div className="reels-scroll" ref={scrollRef} aria-label="Property video feed">
      {items.map((item, index) => (
        <ReelCard
          key={item.id}
          item={item}
          index={index}
          activeIndex={activeIndex}
          rootRef={scrollRef}
          saved={savedIds.has(item.listing.id)}
          onSave={onSave}
          onActive={onActive}
          onInactive={onInactive}
        />
      ))}
      <div className={`reels-load-more${hasMore ? ' has-more' : ''}`} ref={sentinelRef}>
        {loadingMore && <><span className="reels-spinner" />Loading more homes…</>}
        {paginationError && (
          <div role="alert">
            <p>{paginationError}</p>
            <button type="button" className="reels-retry-button" onClick={loadMore}>Try again</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VideoFeed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [savedIds, setSavedIds] = useState(() => new Set())
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()
  const suburb = searchParams.get('suburb') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const filters = useMemo(() => ({
    suburb,
    min_price: minPrice,
    max_price: maxPrice,
  }), [maxPrice, minPrice, suburb])
  const filterKey = JSON.stringify(filters)
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  useEffect(() => {
    if (!isLoggedIn()) return undefined
    let current = true
    api.saved.list()
      .then(listings => {
        if (current) setSavedIds(new Set((listings || []).map(listing => listing.id)))
      })
      .catch(requestError => {
        if (current) setActionError(requestError.message || 'Could not load your saved homes.')
      })
    return () => { current = false }
  }, [])

  function applyFilters(values) {
    const next = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value)
    })
    setSearchParams(next)
    setFiltersOpen(false)
  }

  async function toggleSave(listingId) {
    if (!isLoggedIn()) {
      navigate('/login', { state: { from: { pathname: '/feed' } } })
      return
    }
    const wasSaved = savedIds.has(listingId)
    setActionError('')
    setSavedIds(current => {
      const next = new Set(current)
      if (wasSaved) next.delete(listingId)
      else next.add(listingId)
      return next
    })
    try {
      if (wasSaved) await api.saved.unsave(listingId)
      else await api.saved.save(listingId)
    } catch (requestError) {
      setSavedIds(current => {
        const next = new Set(current)
        if (wasSaved) next.add(listingId)
        else next.delete(listingId)
        return next
      })
      setActionError(requestError.message || 'Could not update your saved homes.')
    }
  }

  return (
    <section className="reels-page">
      <header className="reels-topbar">
        <Link to="/" className="reels-wordmark" aria-label="Houzeey home">Houzeey</Link>
        <span className="reels-topbar-caption">Homes, in motion</span>
        <button type="button" className="reels-filter-button" onClick={() => setFiltersOpen(true)}>
          <span aria-hidden="true">☷</span> Filter {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
        </button>
      </header>

      {actionError && (
        <p className="reels-action-toast" role="alert">
          {actionError}
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss message">×</button>
        </p>
      )}

      <FeedResults
        key={filterKey}
        filters={filters}
        savedIds={savedIds}
        onSave={toggleSave}
      />

      {filtersOpen && (
        <FeedFilterPanel
          key={filterKey}
          filters={filters}
          onApply={applyFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </section>
  )
}
