import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './Notifications.css'

const TYPE_ICON = {
  offer: '🤝',
  application: '📄',
  inspection: '📅',
  message: '💬',
  review: '⭐',
  verification: '✓',
  system: '🔔',
}

export default function Notifications() {
  const [data, setData] = useState({ notifications: [], unread_count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.notifications.list().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function markRead(id) {
    await api.notifications.markRead(id)
    setData(d => ({
      ...d,
      notifications: d.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unread_count: Math.max(0, d.unread_count - 1),
    }))
  }

  async function markAllRead() {
    await api.notifications.markAllRead()
    setData(d => ({
      ...d,
      notifications: d.notifications.map(n => ({ ...n, read: true })),
      unread_count: 0,
    }))
  }

  const groups = {
    today: [],
    earlier: [],
  }

  const now = new Date()
  data.notifications.forEach(n => {
    const d = new Date(n.created_at)
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) groups.today.push(n)
    else groups.earlier.push(n)
  })

  return (
    <div className="notif-page">
      <div className="container">
        <div className="notif-header">
          <div>
            <h1>Notifications</h1>
            {data.unread_count > 0 && <span className="notif-unread-count">{data.unread_count} unread</span>}
          </div>
          {data.unread_count > 0 && (
            <button className="btn-mark-all" onClick={markAllRead}>Mark all as read</button>
          )}
        </div>

        {loading ? (
          <p className="notif-empty">Loading…</p>
        ) : data.notifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">🔔</div>
            <h3>All caught up</h3>
            <p>You'll see offer updates, booking confirmations and messages here.</p>
          </div>
        ) : (
          <div className="notif-list">
            {groups.today.length > 0 && (
              <>
                <h3 className="notif-group-label">Today</h3>
                {groups.today.map(n => <NotifItem key={n.id} n={n} onRead={markRead} />)}
              </>
            )}
            {groups.earlier.length > 0 && (
              <>
                <h3 className="notif-group-label">Earlier</h3>
                {groups.earlier.map(n => <NotifItem key={n.id} n={n} onRead={markRead} />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NotifItem({ n, onRead }) {
  const content = (
    <div className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => !n.read && onRead(n.id)}>
      <div className="notif-icon">{TYPE_ICON[n.type] || '🔔'}</div>
      <div className="notif-body">
        <div className="notif-title">{n.title}</div>
        {n.body && <div className="notif-text">{n.body}</div>}
        <div className="notif-time">{timeAgo(n.created_at)}</div>
      </div>
      {!n.read && <div className="notif-dot" />}
    </div>
  )

  return n.link ? <Link to={n.link} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
