import { Link } from 'react-router-dom'
import './Guides.css'

const GUIDES = [
  {
    id: 'pricing',
    number: '01',
    title: 'Choose a considered asking price',
    intro: 'Research can help you set expectations, but it is not a substitute for an independent valuation or professional advice.',
    points: [
      'Compare recent sales of similar homes in the same area, noting differences in land, condition and features.',
      'Decide whether you want to show a fixed price, a range or invite buyers to contact you.',
      'Be prepared to review your position as you receive genuine buyer feedback.',
    ],
  },
  {
    id: 'presentation',
    number: '02',
    title: 'Prepare a clear, accurate listing',
    intro: 'Good photos and a helpful description make it easier for buyers to understand the property before they enquire.',
    points: [
      'Use bright, uncluttered photos and lead with an image that shows the home clearly.',
      'Describe the layout, features and nearby amenities factually. Check every detail before publishing.',
      'Ask your solicitor or conveyancer what information and disclosures are required for your property and location.',
    ],
  },
  {
    id: 'inspections',
    number: '03',
    title: 'Plan inspections carefully',
    intro: 'A little preparation can make inspections more organised for you and prospective buyers.',
    points: [
      'Choose inspection times you can manage and share clear arrival instructions with attendees.',
      'Secure valuables and personal documents, and consider having another person with you.',
      'Keep notes on questions and feedback so you can follow up consistently.',
    ],
  },
  {
    id: 'offers',
    number: '04',
    title: 'Compare the full offer, not just the price',
    intro: 'A written offer can include important timing and conditions as well as the proposed price.',
    points: [
      'Review the deposit, proposed settlement date, finance and inspection conditions, and any inclusions or exclusions.',
      'Use Houzeey’s offer history to keep counter-offers and responses together.',
      'Before accepting or signing anything, ask your solicitor or conveyancer to explain the implications for your situation.',
    ],
  },
  {
    id: 'legal-support',
    number: '05',
    title: 'Keep your legal representative involved',
    intro: 'Property sale requirements vary across Australia. Your own solicitor or conveyancer is the right person to advise you.',
    points: [
      'Houzeey asks your nominated legal representative to review listing details before publication.',
      'Ask them about contracts, required disclosures, deposits, conditions and settlement for your state or territory.',
      'An offer or Houzeey-generated document is not a substitute for a contract prepared and reviewed by your legal representative.',
    ],
  },
]

export default function Guides() {
  return (
    <div className="guides-page">
      <header className="guides-hero">
        <div className="container">
          <p className="guides-eyebrow">Houzeey seller resources</p>
          <h1>A clearer way to plan a private sale.</h1>
          <p>Practical starting points for preparing your listing, meeting buyers and keeping your legal representative involved.</p>
          <div className="guides-hero-actions">
            <Link to="/sell" className="guides-primary-link">Start a listing <span aria-hidden="true">→</span></Link>
            <Link to="/buy" className="guides-secondary-link">Browse homes</Link>
          </div>
        </div>
      </header>

      <div className="container guides-layout">
        <nav className="guides-toc" aria-label="Selling guide sections">
          <strong>In this guide</strong>
          {GUIDES.map(guide => (
            <a key={guide.id} href={`#${guide.id}`}>{guide.number} · {guide.title}</a>
          ))}
          <p>General information only. It is not legal, financial or valuation advice.</p>
        </nav>

        <main className="guides-articles">
          {GUIDES.map(guide => (
            <article className="guide-article" id={guide.id} key={guide.id}>
              <span className="guide-number">{guide.number}</span>
              <div>
                <h2>{guide.title}</h2>
                <p className="guide-intro">{guide.intro}</p>
                <ul>
                  {guide.points.map(point => <li key={point}>{point}</li>)}
                </ul>
              </div>
            </article>
          ))}

          <aside className="guides-legal-note">
            <strong>Important</strong>
            <p>Houzeey helps owners and buyers connect. It does not verify title, provide legal advice or replace the work of a licensed property professional.</p>
            <Link to="/terms">Read Houzeey’s terms <span aria-hidden="true">→</span></Link>
          </aside>
        </main>
      </div>
    </div>
  )
}
