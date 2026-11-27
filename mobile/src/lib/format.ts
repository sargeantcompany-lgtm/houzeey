import type { Listing } from './api';

export const money = (n: string | number | null | undefined) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('en-AU');

export function priceText(l: Pick<Listing, 'price' | 'price_max' | 'price_display'>) {
  if (l.price_display === 'contact') return 'Contact owner';
  if (l.price_display === 'range' && l.price_max) return `${money(l.price)} – ${money(l.price_max)}`;
  return money(l.price);
}

const TYPE_LABELS: Record<string, string> = {
  house: 'House', apartment: 'Apartment', townhouse: 'Townhouse', unit: 'Unit', land: 'Land', rural: 'Rural',
};
export const typeLabel = (t: string | null) => TYPE_LABELS[String(t || '').toLowerCase()] || 'Home';

export const placeLine = (l: Pick<Listing, 'suburb' | 'state' | 'postcode'>) =>
  [l.suburb, [l.state, l.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export const fullAddress = (l: Pick<Listing, 'address' | 'suburb' | 'state' | 'postcode'>) =>
  [l.address, placeLine(l)].filter(Boolean).join(', ');

export function statusLabel(status: string) {
  if (status === 'sold') return 'Sold';
  if (status === 'under_offer') return 'Under offer';
  return 'Private sale';
}

export function factsLine(l: Pick<Listing, 'beds' | 'baths' | 'cars' | 'land_size' | 'property_type'>) {
  const parts: string[] = [];
  if (l.beds) parts.push(`${l.beds} bed`);
  if (l.baths) parts.push(`${l.baths} bath`);
  if (l.cars) parts.push(`${l.cars} car`);
  if (l.land_size) parts.push(`${l.land_size.toLocaleString('en-AU')} m²`);
  parts.push(typeLabel(l.property_type));
  return parts.join(' · ');
}

// "2 hours ago" (feed) or "2h" (short, for comments).
export function timeAgo(t: string, short = false) {
  const s = Math.max(1, Math.round((Date.now() - new Date(t).getTime()) / 1000));
  const unit = (n: number, word: string, letter: string) => (short ? `${n}${letter}` : `${n} ${word}${n === 1 ? '' : 's'} ago`);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return unit(m, 'minute', 'm');
  const h = Math.round(m / 60);
  if (h < 24) return unit(h, 'hour', 'h');
  const d = Math.round(h / 24);
  if (d < 7) return unit(d, 'day', 'd');
  return new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// A stable colour per listing, used behind homes that have no photo yet.
export function hueFor(id: string) {
  let h = 0;
  for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 32%, 72%)`;
}
