import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { getSession } from '../auth'
import './Messages.css'

export default function Messages() {
  const session = getSession()
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.conversations.list()
      .then(data => {
        setConversations(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeId) return
    api.conversations.messages(activeId)
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    setSending(true)
    try {
      const msg = await api.conversations.send(activeId, draft.trim())
      setMessages(m => [...m, msg])
      setDraft('')
      // Update last message preview
      setConversations(cs => cs.map(c =>
        c.id === activeId ? { ...c, last_message: draft.trim(), last_message_at: new Date().toISOString() } : c
      ))
    } catch {
      // Silently fail — message didn't send
    } finally {
      setSending(false)
    }
  }

  function selectConversation(id) {
    setActiveId(id)
    // Clear unread count locally
    setConversations(cs => cs.map(c => c.id === id ? { ...c, unread_count: '0' } : c))
  }

  const active = conversations.find(c => c.id === activeId)

  function formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)}m ago`
    if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })
  }

  if (loading) return <div className="messages-page"><div className="chat-empty">Loading…</div></div>

  return (
    <div className="messages-page">
      <div className="messages-layout">
        {/* Conversation list */}
        <aside className="convo-list">
          <div className="convo-header">
            <h2>Messages</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="convo-empty">No conversations yet. Contact a seller to start chatting.</div>
          ) : conversations.map(c => (
            <button
              key={c.id}
              className={`convo-item ${activeId === c.id ? 'active' : ''}`}
              onClick={() => selectConversation(c.id)}
            >
              <div className="convo-avatar">{(c.other_user_name || '?')[0]}</div>
              <div className="convo-preview">
                <div className="convo-name">
                  {c.other_user_name}
                  {parseInt(c.unread_count) > 0 && <span className="unread-dot">{c.unread_count}</span>}
                </div>
                <div className="convo-property">{c.listing_title || 'General enquiry'}</div>
                <div className="convo-last">{c.last_message || '…'}</div>
              </div>
              <div className="convo-time">{formatTime(c.last_message_at)}</div>
            </button>
          ))}
        </aside>

        {/* Chat window */}
        <div className="chat-window">
          {active ? (
            <>
              <div className="chat-header">
                <div className="convo-avatar">{(active.other_user_name || '?')[0]}</div>
                <div>
                  <div className="chat-name">{active.other_user_name}</div>
                  <div className="chat-property">{active.listing_title || 'General enquiry'}</div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.map(m => (
                  <div key={m.id} className={`message ${m.sender_id === session?.id ? 'me' : 'them'}`}>
                    <div className="bubble">{m.content}</div>
                    <div className="msg-time">{formatTime(m.created_at)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input" onSubmit={handleSend}>
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty">Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  )
}
