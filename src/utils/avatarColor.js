// Müşteri ismini deterministik olarak renkli bir avatar setine map'ler.
// Aynı isim her zaman aynı rengi alır (stabil hash).
// Uygulama temasıyla uyumlu 7 renklik palet — bordo/altın tabanlı ama çeşitlilik için
// mavi/mor/turuncu/yeşil/gül de dahil.

export const AVATAR_PALETTE = [
  { bg: '#5C0D14', text: '#FFFFFF' }, // bordo (birincil)
  { bg: '#C9A961', text: '#1A0509' }, // altın
  { bg: '#4CA3E0', text: '#FFFFFF' }, // mavi
  { bg: '#7B5EA7', text: '#FFFFFF' }, // mor
  { bg: '#E88B6E', text: '#FFFFFF' }, // turuncu
  { bg: '#5FA574', text: '#FFFFFF' }, // yeşil
  { bg: '#B84A62', text: '#FFFFFF' }, // gül
];

// İsim → deterministik index (0..len-1)
function hashName(name) {
  const s = (name || '').trim();
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAvatarColor(name) {
  return AVATAR_PALETTE[hashName(name) % AVATAR_PALETTE.length];
}

// İsimden baş harfler (2 harf max) — TR uyumlu upper case
export function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || '';
  return (a + b).toLocaleUpperCase('tr');
}
