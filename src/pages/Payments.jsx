import { useState } from 'react'
import { getSession } from '../auth'
import './Payments.css'

const MOCK_LEASES = [
  { id: '1', property: '12 Harbour View Rd, Sydney NSW 2000', landlord: 'Michael Chen', amount: 2400, due: '2026-03-15', status: 'due' },
  { id: '2', property: '8 Beach St, Gold Coast QLD 4217', landlord: 'Sarah Williams', amount: 1850, due: '2026-04-01', status: 'upcoming' },
]

const MOCK_HISTORY = [
  { id: 'p1', property: '12 Harbour View Rd, Sydney NSW 2000', amount: 2400, date: '2026-02-15', method: 'Visa ••4242', status: 'paid', receipt: 'HZ-20260215' },
  { id: 'p2', property: '12 Harbour View Rd, Sydney NSW 2000', amount: 2400, date: '2026-01-15', method: 'Visa ••4242', status: 'paid', receipt: 'HZ-20260115' },
  { id: 'p3', property: '12 Harbour View Rd, Sydney NSW 2000', amount: 2400, date: '2025-12-15', method: 'Visa ••4242', status: 'paid', receipt: 'HZ-20251215' },
]

function CardForm({ lease, onSuccess, onCancel }) {
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' })
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState({})

  function fmt(e) {
    let { name, value } = e.target
    if (name === 'number') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    if (name === 'expiry') value = value.replace(/\D/g, '').slice(0, 4).replace(/^(.{2})(.+)/, '$1/$2')
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 4)
    setCard(c => ({ ...c, [name]: value }))
    setErrors(er => ({ ...er, [name]: '' }))
  }

  function validate() {
    const e = {}
    if (!card.name.trim()) e.name = 'Required'
    if (card.number.replace(/\s/g, '').length < 16) e.number = 'Enter a valid 16-digit card number'
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'Format: MM/YY'
    if (card.cvv.length < 3) e.cvv = 'Invalid CVV'
    return e
  }

  function handlePay(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setProcessing(true)
    setTimeout(() => { setProcessing(false); onSuccess(lease, card) }, 2000)
  }

  return (
    <div className="card-form-wrap">
      <div className="card-form-header">
        <h3>Pay rent</h3>
        <p className="card-form-prop">{lease.property}</p>
        <div className="card-form-amount">${lease.amount.toLocaleString()}<span>/month</span></div>
      </div>

      <form onSubmit={handlePay} className="card-form">
        <div className="card-brand-row">
          <span className="card-brand visa">VISA</span>
          <span className="card-brand mc">MC</span>
          <span className="card-brand amex">AMEX</span>
          <span className="secure-badge">🔒 Secure payment</span>
        </div>

        <div className="field-wrap">
          <label>Cardholder name</label>
          <input name="name" value={card.name} onChange={fmt} placeholder="Jane Smith" autoComplete="cc-name" />
          {errors.name && <span className="field-err">{errors.name}</span>}
        </div>

        <div className="field-wrap">
          <label>Card number</label>
          <input name="number" value={card.number} onChange={fmt} placeholder="1234 5678 9012 3456" autoComplete="cc-number" inputMode="numeric" />
          {errors.number && <span className="field-err">{errors.number}</span>}
        </div>

        <div className="field-row-two">
          <div className="field-wrap">
            <label>Expiry</label>
            <input name="expiry" value={card.expiry} onChange={fmt} placeholder="MM/YY" autoComplete="cc-exp" inputMode="numeric" />
            {errors.expiry && <span className="field-err">{errors.expiry}</span>}
          </div>
          <div className="field-wrap">
            <label>CVV</label>
            <input name="cvv" value={card.cvv} onChange={fmt} placeholder="•••" autoComplete="cc-csc" inputMode="numeric" type="password" />
            {errors.cvv && <span className="field-err">{errors.cvv}</span>}
          </div>
        </div>

        <div className="card-form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-pay" disabled={processing}>
            {processing ? <span className="spinner" /> : `Pay $${lease.amount.toLocaleString()}`}
          </button>
        </div>
      </form>

      <p className="card-form-note">Payments are processed securely. Your card details are never stored on Houzeey servers.</p>
    </div>
  )
}

function SuccessScreen({ receipt, onClose }) {
  return (
    <div className="pay-success">
      <div className="pay-success-icon">✓</div>
      <h2>Payment successful</h2>
      <p>Your rent payment has been processed and a receipt emailed to you.</p>
      <div className="pay-receipt-id">Receipt #{receipt}</div>
      <button className="btn-pay" onClick={onClose}>Done</button>
    </div>
  )
}

export default function Payments() {
  const session = getSession()
  const [selected, setSelected] = useState(null)
  const [success, setSuccess] = useState(null)
  const [history, setHistory] = useState(MOCK_HISTORY)

  function handleSuccess(lease, card) {
    const last4 = card.number.replace(/\s/g, '').slice(-4)
    const receiptId = `HZ-${Date.now()}`
    const newEntry = {
      id: receiptId,
      property: lease.property,
      amount: lease.amount,
      date: new Date().toISOString().slice(0, 10),
      method: `Visa ••${last4}`,
      status: 'paid',
      receipt: receiptId,
    }
    setHistory(h => [newEntry, ...h])
    setSelected(null)
    setSuccess(receiptId)
  }

  return (
    <div className="payments-page">
      <div className="payments-inner container">
        <div className="payments-head">
          <h1>Payments</h1>
          <p>Manage your rent payments, receipts and payment history.</p>
        </div>

        {success && (
          <SuccessScreen receipt={success} onClose={() => setSuccess(null)} />
        )}

        {!success && selected && (
          <CardForm
            lease={selected}
            onSuccess={handleSuccess}
            onCancel={() => setSelected(null)}
          />
        )}

        {!success && !selected && (
          <>
            {/* Due payments */}
            <section className="pay-section">
              <h2>Upcoming payments</h2>
              <div className="lease-list">
                {MOCK_LEASES.map(lease => (
                  <div key={lease.id} className={`lease-card ${lease.status}`}>
                    <div className="lease-info">
                      <div className="lease-property">{lease.property}</div>
                      <div className="lease-landlord">Payable to {lease.landlord}</div>
                      <div className="lease-due">Due {new Date(lease.due).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div className="lease-right">
                      <div className="lease-amount">${lease.amount.toLocaleString()}</div>
                      <span className={`lease-badge ${lease.status}`}>{lease.status === 'due' ? 'Due soon' : 'Upcoming'}</span>
                      <button className="btn-pay-now" onClick={() => setSelected(lease)}>
                        {lease.status === 'due' ? 'Pay now' : 'Pay early'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* History */}
            <section className="pay-section">
              <h2>Payment history</h2>
              <div className="history-table">
                <div className="history-head">
                  <span>Property</span>
                  <span>Date</span>
                  <span>Method</span>
                  <span>Amount</span>
                  <span>Receipt</span>
                </div>
                {history.map(p => (
                  <div key={p.id} className="history-row">
                    <span className="history-prop">{p.property}</span>
                    <span>{new Date(p.date).toLocaleDateString('en-AU')}</span>
                    <span>{p.method}</span>
                    <span className="history-amount">${p.amount.toLocaleString()}</span>
                    <span>
                      <button className="btn-receipt" onClick={() => alert(`Receipt ${p.receipt} — download coming soon`)}>
                        {p.receipt}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
