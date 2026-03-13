import { useState, useEffect } from 'react'
import { api } from '../api'
import './Payments.css'

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

  async function handlePay(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setProcessing(true)
    try {
      const result = await api.payments.pay({
        lease_id: lease.id,
        listing_id: lease.listing_id,
        amount: lease.monthly_amount,
        method: 'card',
      })
      onSuccess(lease, card, result.receipt_id)
    } catch (err) {
      alert(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const propertyLabel = lease.listing_address || lease.listing_title || 'Property'

  return (
    <div className="card-form-wrap">
      <div className="card-form-header">
        <h3>Pay rent</h3>
        <p className="card-form-prop">{propertyLabel}</p>
        <div className="card-form-amount">${Number(lease.monthly_amount).toLocaleString()}<span>/month</span></div>
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
            {processing ? <span className="spinner" /> : `Pay $${Number(lease.monthly_amount).toLocaleString()}`}
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
      <p>Your rent payment has been processed.</p>
      <div className="pay-receipt-id">Receipt #{receipt}</div>
      <button className="btn-pay" onClick={onClose}>Done</button>
    </div>
  )
}

export default function Payments() {
  const [leases, setLeases] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    Promise.all([api.payments.leases(), api.payments.history()])
      .then(([l, h]) => { setLeases(l); setHistory(h) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSuccess(lease, card, receiptId) {
    const last4 = card.number.replace(/\s/g, '').slice(-4)
    setHistory(h => [{
      id: receiptId,
      listing_title: lease.listing_title,
      listing_address: lease.listing_address,
      amount: lease.monthly_amount,
      paid_at: new Date().toISOString(),
      method: `Visa ••${last4}`,
      status: 'paid',
      receipt_id: receiptId,
    }, ...h])
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
            {/* Upcoming payments */}
            <section className="pay-section">
              <h2>Upcoming payments</h2>
              {loading ? (
                <p>Loading…</p>
              ) : leases.length === 0 ? (
                <p className="dash-empty">No active leases. A landlord will set up your lease after you sign a tenancy agreement.</p>
              ) : (
                <div className="lease-list">
                  {leases.map(lease => {
                    const dueDate = lease.due_day
                      ? new Date(new Date().getFullYear(), new Date().getMonth(), lease.due_day)
                      : null
                    const isDue = dueDate && dueDate <= new Date()
                    return (
                      <div key={lease.id} className={`lease-card ${isDue ? 'due' : 'upcoming'}`}>
                        <div className="lease-info">
                          <div className="lease-property">{lease.listing_address || lease.listing_title}</div>
                          <div className="lease-landlord">Payable to {lease.landlord_name}</div>
                          {dueDate && (
                            <div className="lease-due">
                              Due {dueDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                        <div className="lease-right">
                          <div className="lease-amount">${Number(lease.monthly_amount).toLocaleString()}</div>
                          <span className={`lease-badge ${isDue ? 'due' : 'upcoming'}`}>{isDue ? 'Due soon' : 'Upcoming'}</span>
                          <button className="btn-pay-now" onClick={() => setSelected(lease)}>
                            {isDue ? 'Pay now' : 'Pay early'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* History */}
            <section className="pay-section">
              <h2>Payment history</h2>
              {loading ? (
                <p>Loading…</p>
              ) : history.length === 0 ? (
                <p className="dash-empty">No payment history yet.</p>
              ) : (
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
                      <span className="history-prop">{p.listing_address || p.listing_title || 'Payment'}</span>
                      <span>{new Date(p.paid_at).toLocaleDateString('en-AU')}</span>
                      <span>{p.method || 'Card'}</span>
                      <span className="history-amount">${Number(p.amount).toLocaleString()}</span>
                      <span>
                        <span className="btn-receipt">{p.receipt_id}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
