import { useState } from 'react'
import './Messages.css'

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    with: 'Michael Chen',
    property: '4 Bed Family Home, Surry Hills',
    lastMessage: 'Yes, the inspection is confirmed for Saturday.',
    time: '2h ago',
    unread: 2,
    messages: [
      { from: 'them', text: 'Hi, I saw your listing and I\'m interested in the property.', time: '10:00am' },
      { from: 'me', text: 'Thanks for reaching out! Happy to answer any questions.', time: '10:15am' },
      { from: 'them', text: 'Is the inspection slot on Saturday still available?', time: '10:20am' },
      { from: 'me', text: 'Yes, the inspection is confirmed for Saturday.', time: '2h ago' },
    ],
  },
  {
    id: 2,
    with: 'Sarah Johnson',
    property: 'City Apartment, CBD VIC',
    lastMessage: 'Can we negotiate on the rent?',
    time: '1d ago',
    unread: 0,
    messages: [
      { from: 'them', text: 'Hello, is the apartment still available?', time: 'Yesterday' },
      { from: 'me', text: 'Yes it is! Would you like to arrange an inspection?', time: 'Yesterday' },
      { from: 'them', text: 'Can we negotiate on the rent?', time: '1d ago' },
    ],
  },
]

export default function Messages() {
  const [activeId, setActiveId] = useState(1)
  const [draft, setDraft] = useState('')

  const active = MOCK_CONVERSATIONS.find(c => c.id === activeId)

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    // TODO: wire to backend
    setDraft('')
  }

  return (
    <div className="messages-page">
      <div className="messages-layout">
        {/* Conversation list */}
        <aside className="convo-list">
          <div className="convo-header">
            <h2>Messages</h2>
          </div>
          {MOCK_CONVERSATIONS.map(c => (
            <button
              key={c.id}
              className={`convo-item ${activeId === c.id ? 'active' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              <div className="convo-avatar">{c.with[0]}</div>
              <div className="convo-preview">
                <div className="convo-name">
                  {c.with}
                  {c.unread > 0 && <span className="unread-dot">{c.unread}</span>}
                </div>
                <div className="convo-property">{c.property}</div>
                <div className="convo-last">{c.lastMessage}</div>
              </div>
              <div className="convo-time">{c.time}</div>
            </button>
          ))}
        </aside>

        {/* Chat window */}
        <div className="chat-window">
          {active ? (
            <>
              <div className="chat-header">
                <div className="convo-avatar">{active.with[0]}</div>
                <div>
                  <div className="chat-name">{active.with}</div>
                  <div className="chat-property">{active.property}</div>
                </div>
              </div>

              <div className="chat-messages">
                {active.messages.map((m, i) => (
                  <div key={i} className={`message ${m.from}`}>
                    <div className="bubble">{m.text}</div>
                    <div className="msg-time">{m.time}</div>
                  </div>
                ))}
              </div>

              <form className="chat-input" onSubmit={handleSend}>
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit">Send</button>
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
