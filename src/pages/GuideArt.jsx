/* Illustrations for the selling guide, drawn in Houzeey colours (800 x 350, same 16:7 shape as before). */

const C = {
  deep: '#173b49',
  brand: '#1b6570',
  mid: '#2b7f8a',
  soft: '#eaf3f1',
  accent: '#a4d5cc',
  line: '#d6e4e6',
  gold: '#f5c26b',
  red: '#e31a47',
  green: '#3bb54a',
  white: '#ffffff',
}

function Frame({ id, children, label }) {
  return (
    <svg className="guide-art-svg" viewBox="0 0 800 350" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f7a80" />
          <stop offset="1" stopColor={C.deep} />
        </linearGradient>
      </defs>
      <rect width="800" height="350" fill={`url(#bg-${id})`} />
      <circle cx="690" cy="60" r="120" fill={C.accent} opacity=".12" />
      <circle cx="70" cy="330" r="110" fill={C.accent} opacity=".08" />
      {children}
    </svg>
  )
}

function Price() {
  const bars = [70, 95, 82, 120, 104]
  return (
    <Frame id="price" label="A house with a price tag next to a chart of recent sales">
      <rect x="0" y="300" width="800" height="50" fill={C.white} opacity=".06" />
      {/* house */}
      <polygon points="200,178 320,92 440,178" fill={C.accent} />
      <rect x="220" y="172" width="200" height="128" rx="6" fill={C.white} />
      <rect x="240" y="198" width="44" height="38" rx="4" fill={C.soft} stroke={C.line} strokeWidth="3" />
      <rect x="356" y="198" width="44" height="38" rx="4" fill={C.soft} stroke={C.line} strokeWidth="3" />
      <rect x="300" y="226" width="40" height="74" rx="4" fill={C.brand} />
      <circle cx="332" cy="265" r="3.5" fill={C.gold} />
      {/* price tag */}
      <path d="M432 172 Q470 168 488 196" fill="none" stroke={C.white} strokeWidth="3" />
      <g transform="translate(478 188) rotate(10)">
        <path d="M0 26 L22 0 H138 a12 12 0 0 1 12 12 V64 a12 12 0 0 1 -12 12 H22 L0 50 Z" fill={C.gold} />
        <circle cx="20" cy="38" r="6" fill={C.deep} />
        <text x="40" y="50" fontSize="27" fontWeight="800" fill={C.deep} fontFamily="Inter, Arial, sans-serif">$850k</text>
      </g>
      {/* recent sales chart */}
      <g transform="translate(652 120)">
        <text x="0" y="-14" fontSize="14" fontWeight="700" fill={C.accent} fontFamily="Inter, Arial, sans-serif" letterSpacing="1">RECENT SALES</text>
        <line x1="0" y1="160" x2="124" y2="160" stroke={C.white} strokeOpacity=".5" strokeWidth="2" />
        {bars.map((h, i) => (
          <rect key={i} x={4 + i * 24} y={160 - h} width="17" height={h} rx="4" fill={i === 3 ? C.gold : C.white} opacity={i === 3 ? 1 : 0.8} />
        ))}
      </g>
    </Frame>
  )
}

function Photos() {
  return (
    <Frame id="photos" label="A phone filming a bright living room">
      {/* sun / light */}
      <circle cx="170" cy="100" r="38" fill={C.gold} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <line key={a} x1="170" y1="44" x2="170" y2="28" stroke={C.gold} strokeWidth="6" strokeLinecap="round" transform={`rotate(${a} 170 100)`} />
      ))}
      {/* phone */}
      <rect x="310" y="30" width="170" height="292" rx="26" fill={C.deep} stroke={C.white} strokeWidth="4" />
      <rect x="322" y="50" width="146" height="252" rx="14" fill={C.soft} />
      <rect x="338" y="74" width="54" height="50" rx="4" fill={C.accent} />
      <line x1="365" y1="74" x2="365" y2="124" stroke={C.white} strokeWidth="3" />
      <rect x="410" y="96" width="4" height="70" fill={C.deep} />
      <path d="M396 96 h32 l-8 -20 h-16 z" fill={C.gold} />
      <rect x="336" y="204" width="118" height="26" rx="8" fill={C.mid} />
      <rect x="336" y="224" width="118" height="30" rx="8" fill={C.brand} />
      <rect x="322" y="256" width="146" height="46" fill={C.line} />
      <circle cx="395" cy="160" r="26" fill={C.white} opacity=".92" />
      <path d="M387 147 L407 160 L387 173 Z" fill={C.brand} />
      <circle cx="342" cy="282" r="7" fill={C.red} />
      <text x="355" y="287" fontSize="14" fontWeight="800" fill={C.deep} fontFamily="Inter, Arial, sans-serif">REC</text>
      {/* printed photos */}
      <g transform="translate(560 70) rotate(-8)">
        <rect width="150" height="120" rx="6" fill={C.white} />
        <rect x="10" y="10" width="130" height="80" rx="3" fill={C.accent} />
        <polygon points="45,70 75,45 105,70" fill={C.white} />
        <rect x="55" y="68" width="40" height="22" fill={C.white} />
      </g>
      <g transform="translate(585 190) rotate(6)">
        <rect width="150" height="120" rx="6" fill={C.white} />
        <rect x="10" y="10" width="130" height="80" rx="3" fill={C.gold} opacity=".8" />
        <rect x="30" y="50" width="90" height="26" rx="6" fill={C.brand} />
      </g>
    </Frame>
  )
}

function Solicitor() {
  return (
    <Frame id="solicitor" label="A contract reviewed by a solicitor with an ID card and a verified shield">
      {/* ID card */}
      <g transform="translate(95 160) rotate(-8)">
        <rect width="180" height="114" rx="12" fill={C.soft} />
        <circle cx="44" cy="52" r="22" fill={C.accent} />
        <circle cx="44" cy="46" r="9" fill={C.brand} />
        <path d="M28 70 q16 -18 32 0" fill={C.brand} />
        <rect x="80" y="34" width="80" height="10" rx="5" fill={C.brand} />
        <rect x="80" y="54" width="62" height="8" rx="4" fill={C.line} />
        <rect x="80" y="70" width="70" height="8" rx="4" fill={C.line} />
        <rect x="20" y="90" width="140" height="8" rx="4" fill={C.line} />
      </g>
      {/* document */}
      <rect x="300" y="34" width="220" height="286" rx="10" fill={C.white} />
      <rect x="324" y="58" width="120" height="14" rx="7" fill={C.brand} />
      {[96, 118, 140, 162, 184, 206].map((y, i) => (
        <rect key={y} x="324" y={y} width={i % 3 === 2 ? 120 : 172} height="9" rx="4.5" fill={C.line} />
      ))}
      <path d="M326 262 c14 -22 24 10 36 -6 s18 -18 26 4 s16 0 26 -8" fill="none" stroke={C.deep} strokeWidth="3" strokeLinecap="round" />
      <line x1="324" y1="276" x2="430" y2="276" stroke={C.line} strokeWidth="2" />
      <circle cx="478" cy="270" r="32" fill={C.green} />
      <path d="M463 270 l11 11 l20 -22" fill="none" stroke={C.white} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {/* verified shield */}
      <path d="M640 80 l70 26 v52 c0 50 -34 82 -70 98 c-36 -16 -70 -48 -70 -98 v-52 z" fill={C.accent} />
      <path d="M612 168 l20 20 l38 -42" fill="none" stroke={C.deep} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

function Inspections() {
  return (
    <Frame id="inspections" label="A house with its front door open and an open home sign">
      <rect x="0" y="306" width="800" height="44" fill={C.white} opacity=".06" />
      <polygon points="150,110 330,30 510,110" fill={C.accent} />
      <rect x="170" y="104" width="320" height="206" fill={C.white} />
      <rect x="196" y="140" width="62" height="52" rx="4" fill={C.soft} stroke={C.line} strokeWidth="3" />
      <rect x="402" y="140" width="62" height="52" rx="4" fill={C.soft} stroke={C.line} strokeWidth="3" />
      {/* open door */}
      <rect x="288" y="176" width="84" height="134" fill={C.deep} />
      <rect x="300" y="190" width="60" height="120" fill={C.gold} opacity=".35" />
      <polygon points="372,176 404,166 404,318 372,310" fill={C.brand} />
      <circle cx="396" cy="246" r="4" fill={C.gold} />
      <rect x="276" y="306" width="108" height="10" rx="3" fill={C.line} />
      {/* bushes */}
      <circle cx="196" cy="300" r="26" fill={C.green} opacity=".85" />
      <circle cx="226" cy="306" r="20" fill={C.green} opacity=".7" />
      <circle cx="466" cy="300" r="26" fill={C.green} opacity=".85" />
      {/* open home sign */}
      <line x1="560" y1="314" x2="590" y2="200" stroke={C.white} strokeWidth="6" strokeLinecap="round" />
      <line x1="700" y1="314" x2="670" y2="200" stroke={C.white} strokeWidth="6" strokeLinecap="round" />
      <rect x="548" y="186" width="164" height="86" rx="8" fill={C.gold} />
      <text x="630" y="224" textAnchor="middle" fontSize="24" fontWeight="800" fill={C.deep} fontFamily="Inter, Arial, sans-serif">OPEN</text>
      <text x="630" y="254" textAnchor="middle" fontSize="24" fontWeight="800" fill={C.deep} fontFamily="Inter, Arial, sans-serif">HOME</text>
      {/* sign-in clipboard */}
      <g transform="translate(600 60) rotate(6)">
        <rect width="96" height="112" rx="8" fill={C.white} />
        <rect x="30" y="-8" width="36" height="16" rx="4" fill={C.brand} />
        {[24, 44, 64, 84].map(y => (
          <g key={y}>
            <rect x="14" y={y} width="10" height="10" rx="2" fill={C.accent} />
            <rect x="30" y={y + 2} width="52" height="7" rx="3.5" fill={C.line} />
          </g>
        ))}
      </g>
    </Frame>
  )
}

function Contract() {
  return (
    <Frame id="contract" label="A calendar with settlement day circled, a signed contract and house keys">
      {/* calendar */}
      <rect x="96" y="80" width="180" height="190" rx="14" fill={C.white} />
      <rect x="96" y="80" width="180" height="42" rx="14" fill={C.brand} />
      <rect x="96" y="106" width="180" height="16" fill={C.brand} />
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x={114 + (i % 5) * 31} y={138 + Math.floor(i / 5) * 30} width="20" height="16" rx="4" fill={i === 13 ? C.gold : C.line} />
      ))}
      <circle cx="217" cy="206" r="19" fill="none" stroke={C.red} strokeWidth="4" />
      {/* contract + pen */}
      <rect x="320" y="50" width="196" height="262" rx="10" fill={C.white} />
      <text x="342" y="88" fontSize="17" fontWeight="800" fill={C.deep} fontFamily="Inter, Arial, sans-serif">CONTRACT</text>
      {[106, 126, 146, 166, 186].map((y, i) => (
        <rect key={y} x="342" y={y} width={i === 4 ? 100 : 152} height="8" rx="4" fill={C.line} />
      ))}
      <path d="M344 262 c12 -20 22 8 32 -6 s16 -16 24 4 s14 0 24 -8" fill="none" stroke={C.deep} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(470 196) rotate(40)">
        <rect width="16" height="110" rx="6" fill={C.deep} />
        <polygon points="0,110 16,110 8,130" fill={C.gold} />
      </g>
      {/* keys */}
      <circle cx="640" cy="110" r="30" fill="none" stroke={C.gold} strokeWidth="8" />
      <g transform="rotate(-18 640 140)">
        <circle cx="640" cy="176" r="30" fill={C.gold} />
        <circle cx="640" cy="168" r="9" fill={C.deep} />
        <rect x="632" y="200" width="16" height="96" rx="4" fill={C.gold} />
        <rect x="648" y="250" width="16" height="10" fill={C.gold} />
        <rect x="648" y="272" width="22" height="10" fill={C.gold} />
      </g>
      <g transform="rotate(22 640 140)">
        <rect x="616" y="150" width="48" height="48" rx="12" fill={C.accent} />
        <rect x="633" y="194" width="14" height="86" rx="4" fill={C.accent} />
        <rect x="647" y="244" width="14" height="10" fill={C.accent} />
      </g>
    </Frame>
  )
}

function Negotiate() {
  const font = 'Inter, Arial, sans-serif'
  return (
    <Frame id="negotiate" label="An offer and a counter-offer in chat bubbles, ending in an accepted deal">
      <text x="140" y="44" fontSize="14" fontWeight="700" fill={C.accent} fontFamily={font} letterSpacing="1">BUYER</text>
      <rect x="130" y="54" width="290" height="80" rx="20" fill={C.white} />
      <path d="M158 132 l-8 26 l34 -26 z" fill={C.white} />
      <text x="156" y="88" fontSize="15" fontWeight="600" fill={C.brand} fontFamily={font}>Offer</text>
      <text x="156" y="118" fontSize="28" fontWeight="800" fill={C.deep} fontFamily={font}>$820,000</text>

      <text x="660" y="160" textAnchor="end" fontSize="14" fontWeight="700" fill={C.accent} fontFamily={font} letterSpacing="1">YOU</text>
      <rect x="380" y="170" width="290" height="80" rx="20" fill={C.accent} />
      <path d="M642 248 l8 26 l-34 -26 z" fill={C.accent} />
      <text x="406" y="204" fontSize="15" fontWeight="600" fill={C.brand} fontFamily={font}>Counter-offer</text>
      <text x="406" y="234" fontSize="28" fontWeight="800" fill={C.deep} fontFamily={font}>$845,000</text>

      <rect x="300" y="284" width="200" height="46" rx="23" fill={C.green} />
      <path d="M330 307 l9 9 l17 -18" fill="none" stroke={C.white} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="368" y="314" fontSize="20" fontWeight="800" fill={C.white} fontFamily={font}>Accepted</text>
    </Frame>
  )
}

const ART = {
  price: Price,
  photos: Photos,
  solicitor: Solicitor,
  inspections: Inspections,
  contract: Contract,
  negotiate: Negotiate,
}

export default function GuideArt({ id }) {
  const Art = ART[id]
  return Art ? <Art /> : null
}
