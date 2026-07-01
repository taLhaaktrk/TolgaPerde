// TR telefon formatlama: "0551 100 9340" — boşluklarla.
// Sadece rakam alır, max 11 hane (başında 0 dahil).
export function formatPhoneTR(input) {
  if (!input) return '';
  // Sadece rakam
  let d = String(input).replace(/\D/g, '');
  // Başında 0 yoksa ekleme — kullanıcı 5xx ile başlarsa 0 prefix'i otomatik koyalım
  if (d.length > 0 && d[0] !== '0') d = '0' + d;
  // 11 hane sınırı (0 + 10)
  if (d.length > 11) d = d.slice(0, 11);

  // 0AAA BBB CCCC formatı
  const parts = [];
  if (d.length > 0) parts.push(d.slice(0, 4));
  if (d.length > 4) parts.push(d.slice(4, 7));
  if (d.length > 7) parts.push(d.slice(7, 11));
  return parts.join(' ');
}

// Tutar formatlama: 10000 → "10.000" (TR binlik ayraç)
// Kullanıcı yazarken canlı format için: parse → format.
export function formatAmountTR(input) {
  if (input === null || input === undefined) return '';
  // Sadece rakam (virgül/nokta da olabilir, şimdilik tam sayı odaklı)
  const digitsOnly = String(input).replace(/\D/g, '');
  if (!digitsOnly) return '';
  // baştaki sıfırları kaldır ("00500" → "500"), ama tek başına "0" kalsın
  const clean = digitsOnly.replace(/^0+(?=\d)/, '');
  // Binlik nokta ayraç
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Formatlı tutar string'ini sayıya çevir: "10.000" → 10000
export function parseAmountTR(str) {
  if (!str) return 0;
  const digits = String(str).replace(/\D/g, '');
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

// İsim auto-capitalize: "ahmet kara" → "Ahmet Kara"
// Türkçe karakter doğru: "ışık" → "Işık", "iLkER" → "İlker"
// Boşluktan sonra her kelimenin ilk harfi büyük.
export function capitalizeNameTR(input) {
  if (!input) return '';
  // Türkçe lower: "İ" → "i", "I" → "ı" gibi locale-aware
  return String(input)
    .toLocaleLowerCase('tr')
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // "i" → "İ" Türkçe büyütme için locale-aware upper
      return word.charAt(0).toLocaleUpperCase('tr') + word.slice(1);
    })
    .join(' ');
}
