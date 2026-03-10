import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Marketplace.css'

const ITEMS = [
  { id: 1, title: 'IKEA KALLAX Shelf Unit', price: 80, condition: 'Good', category: 'Furniture', suburb: 'Newtown NSW', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
  { id: 2, title: 'Samsung 65" 4K TV', price: 650, condition: 'Like new', category: 'Electronics', suburb: 'Fitzroy VIC', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f4e86d?w=400&q=80' },
  { id: 3, title: 'Moving boxes (20 pack)', price: 25, condition: 'New', category: 'Moving', suburb: 'Brisbane QLD', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: 4, title: 'Dyson V11 Vacuum', price: 320, condition: 'Good', category: 'Appliances', suburb: 'Surry Hills NSW', img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&q=80' },
  { id: 5, title: 'Outdoor timber table set', price: 280, condition: 'Fair', category: 'Furniture', suburb: 'Manly NSW', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
  { id: 6, title: 'LG Washing Machine 8kg', price: 400, condition: 'Good', category: 'Appliances', suburb: 'St Kilda VIC', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
]

const CATEGORIES = ['All', 'Furniture', 'Appliances', 'Electronics', 'Moving', 'Other']

export default function Marketplace() {
  const [category, setCategory] = useState('All')

  const filtered = category === 'All' ? ITEMS : ITEMS.filter(i => i.category === category)

  return (
    <div className="marketplace-page">
      <div className="mp-header">
        <div className="container">
          <h1>Marketplace</h1>
          <p>Buy and sell furniture, appliances and moving supplies from fellow Houzeey members.</p>
          <Link to="/marketplace/sell" className="btn-sell-item">+ Sell an item</Link>
        </div>
      </div>

      <div className="mp-body container">
        <div className="mp-categories">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`cat-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >{c}</button>
          ))}
        </div>

        <div className="mp-grid">
          {filtered.map(item => (
            <div key={item.id} className="mp-card">
              <div className="mp-img">
                <img src={item.img} alt={item.title} />
                <span className="mp-condition">{item.condition}</span>
              </div>
              <div className="mp-info">
                <div className="mp-price">${item.price}</div>
                <h3>{item.title}</h3>
                <p className="mp-suburb">📍 {item.suburb}</p>
                <div className="mp-actions">
                  <button className="btn-mp-contact">Message seller</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
