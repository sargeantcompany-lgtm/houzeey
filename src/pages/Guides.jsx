import { Link } from 'react-router-dom'
import GuideArt from './GuideArt'

const GUIDES = [
  { id: 'price', title: 'Setting the right asking price', read: '5 min read', body: [
    'Compare recent sales of similar homes nearby, ideally from the last three to six months, with the same number of bedrooms and similar land size, parking and condition.',
    'An independent valuation (usually a few hundred dollars) gives you an objective figure to back up your price when you talk to buyers.',
    'Price realistically from day one. Well-priced homes usually attract the most interest and inspections in the first two to three weeks.',
  ] },
  { id: 'photos', title: 'Photos, video and a listing that stands out', read: '4 min read', body: [
    'Shoot on a bright, overcast day or in soft morning or late-afternoon light. Open the blinds, turn on the lights and clear benches so rooms feel open.',
    'Film a short vertical walk-through on your phone (under two minutes) so buyers get a real sense of the layout. It plays like a reel in the feed and in Tours.',
    "In the description, mention what photos can't show: the street, the natural light, the walk to transport or shops, and recent updates. Keep everything accurate and use current photos.",
  ] },
  { id: 'solicitor', title: 'Your solicitor, identity checks and disclosure', read: '5 min read', body: [
    'Before your listing goes live on Houzeey, your solicitor or conveyancer reviews it and confirms they have completed identity and anti-money-laundering (AML) checks on you.',
    'Most states require disclosure documents to be given to a buyer before they sign: for example a Form 2 seller disclosure statement in Queensland, a Section 32 vendor statement in Victoria, or a contract with prescribed documents in NSW. Engage your solicitor early so these are ready before you take serious offers.',
    'Once an offer is accepted, both sides add their solicitor or conveyancer on the Offers page. Houzeey emails them the agreed terms, and you follow each step (identity, AML, disclosure, contract, deposit, settlement) on a shared checklist.',
  ] },
  { id: 'inspections', title: 'Running open homes safely', read: '4 min read', body: [
    'Consider showing your home by appointment rather than holding drop-in open homes, and have another adult with you whenever you can.',
    "Lock away valuables, keys, medication and documents. Keep a simple sign-in record of each visitor's name, phone number and visit time, and use it only for security and follow-up.",
    "Follow up with every visitor within 24 hours. Ask what they liked and whether they're thinking about making an offer.",
  ] },
  { id: 'contract', title: 'Contracts, cooling-off and settlement', read: '6 min read', body: [
    "Your solicitor or conveyancer prepares the contract of sale. Nothing agreed on Houzeey is legally binding until contracts are signed and exchanged under your state's rules.",
    'Cooling-off periods differ by state. For example, it is 5 business days in NSW and QLD, 3 in VIC and 2 in SA, while WA and Tasmania have no standard cooling-off period for home sales. Exceptions apply, so check the current rules with your conveyancer.',
    'Once contracts are binding, the buyer pays the agreed deposit into a trust account, conditions such as finance or a building and pest inspection are met, and settlement usually happens 30 to 90 days later.',
  ] },
  { id: 'negotiate', title: 'Negotiating with buyers', read: '5 min read', body: [
    'Ask every buyer to make their offer through Houzeey so the price, deposit, settlement date and any conditions (such as finance or a building and pest inspection) are recorded in one place.',
    'Compare the whole offer, not just the price. An unconditional offer at a slightly lower price can be less likely to fall through than a higher offer with lots of conditions.',
    "You don't have to answer straight away. Take your time, counter clearly, and check any special conditions with your conveyancer before agreeing.",
  ] },
]

export default function Guides() {
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <p className="eyebrow">Selling guides</p>
          <h1>Selling your home without an agent</h1>
          <p className="muted">Plain-English steps for private sellers in Australia. General information only. Always confirm the rules and deadlines for your state with a solicitor or conveyancer.</p>
        </div>
      </section>
      <div className="container guides-page">
        <nav className="guide-toc" aria-label="Guide sections">
          <h2>In this guide</h2>
          {GUIDES.map(g => <a key={g.id} href={`#${g.id}`}>{g.title}</a>)}
        </nav>
        <div className="guide-articles">
          {GUIDES.map(g => (
            <article key={g.id} className="guide-article" id={g.id}>
              <div className="guide-art guide-art-figure"><GuideArt id={g.id} /></div>
              <span className="muted">{g.read}</span>
              <h2>{g.title}</h2>
              {g.body.map((p, i) => <p key={i}>{p}</p>)}
            </article>
          ))}
          <div className="guide-cta">
            <h2>Ready to list?</h2>
            <p>It&apos;s free to post your home, and buyers can make offers straight from your listing. Legal, search and conveyancing fees are separate.</p>
            <Link className="btn btn-primary" to="/sell">List your property</Link>
          </div>
        </div>
      </div>
    </>
  )
}
