import { Link } from 'react-router-dom'

const GUIDES = [
  { id: 'price', title: 'Setting the right asking price', read: '5 min read', hue: 12, body: [
    'Look at what similar homes nearby sold for in the last six months: same number of bedrooms, similar land size and condition.',
    'Consider paying for an independent valuation (usually a few hundred dollars). It gives you a figure to point buyers to.',
    'Price realistically. Homes priced well attract more enquiries in the first two weeks, which is when buyer interest is highest.',
  ] },
  { id: 'photos', title: 'Photos, video and a listing that stands out', read: '4 min read', hue: 200, body: [
    'Shoot on a bright, overcast day or in the morning. Open blinds, turn on lights and clear benches.',
    'Film a short vertical walk-through on your phone (under two minutes). It plays like a reel in the feed and in Tours.',
    "In the description, mention what buyers can't see in photos: the street, the light, the walk to the station, recent updates.",
  ] },
  { id: 'solicitor', title: 'Your solicitor, identity checks and disclosure', read: '5 min read', hue: 300, body: [
    'Every Houzeey sale listing is reviewed by your solicitor or conveyancer before it goes live. They confirm the details and that they have done identity and anti-money-laundering (AML) checks on you.',
    'Most states require disclosure documents before a buyer signs: for example a Form 2 seller disclosure statement in Queensland, a Section 32 vendor statement in Victoria, or a contract with prescribed documents in NSW. Your solicitor prepares these.',
    "Once an offer is accepted, both sides add their solicitor on the Offers page. Houzeey emails them the agreed terms and you follow each step (identity, AML, disclosure, contract, deposit, settlement) on a shared checklist.",
  ] },
  { id: 'inspections', title: 'Running open homes safely', read: '4 min read', hue: 150, body: [
    'Keep a sign-in register with names and phone numbers of everyone who attends.',
    'Lock away valuables, medication and documents. Have a friend with you if you can.',
    "Follow up with every visitor within a day. Ask what they liked and whether they're considering an offer.",
  ] },
  { id: 'contract', title: 'Contracts, cooling-off and settlement', read: '6 min read', hue: 260, body: [
    'A contract of sale is prepared by a conveyancer or solicitor. Nothing agreed on Houzeey is binding until contracts are signed and exchanged.',
    'Cooling-off periods differ by state: for example around 5 business days in NSW and QLD, 3 in VIC and 2 in SA. Check the current rules for your state.',
    'After exchange the buyer pays a deposit into a trust account, conditions such as finance are satisfied, and settlement usually happens 30 to 90 days later.',
  ] },
  { id: 'negotiate', title: 'Negotiating with buyers', read: '5 min read', hue: 32, body: [
    'Ask every buyer to make their offer through Houzeey so the price, deposit, settlement date and conditions are recorded.',
    'An unconditional offer at a slightly lower price can be worth more than a conditional one.',
    "You don't have to answer straight away. Sleep on it and talk to your conveyancer.",
  ] },
]

export default function Guides() {
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <p className="eyebrow">Selling guides</p>
          <h1>Selling your home without an agent</h1>
          <p className="muted">Plain-English steps for private sellers in Australia. General information only, not legal advice.</p>
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
              <div className="guide-art" style={{ '--h': g.hue }} aria-hidden="true" />
              <span className="muted">{g.read}</span>
              <h2>{g.title}</h2>
              {g.body.map((p, i) => <p key={i}>{p}</p>)}
            </article>
          ))}
          <div className="guide-cta">
            <h2>Ready to list?</h2>
            <p>It&apos;s free to post your home, and buyers can make offers straight from your listing.</p>
            <Link className="btn btn-primary" to="/sell">List your property</Link>
          </div>
        </div>
      </div>
    </>
  )
}
