// TolgaPerde — Raporlar ekranı için aggregation yardımcısı.
// customers dizisinden tüm ciro/alacak/aylık dağılım hesaplarını yapar.

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

// Ay isimleri — bar chart X ekseninde kullanılır.
export const MONTH_LABELS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

/**
 * Tüm rapor metriklerini tek seferde hesaplar.
 * @param {Array} customers — Firestore'dan gelen müşteri dizisi
 * @returns {{
 *   totalRevenue: number,        // Tüm zamanlar — totalAmount toplamı
 *   monthRevenue: number,        // İçinde bulunduğumuz ay — yeni eklenenlerin totalAmount toplamı
 *   pendingReceivable: number,   // Bekleyen alacak — remainingAmount toplamı
 *   collectedAmount: number,     // Tahsil edilen — totalRevenue - pendingReceivable
 *   collectionRatio: number,     // Tahsilat oranı 0..1 — pie chart için
 *   monthlySales: Array<{month:number, label:string, value:number}>,
 *                                // Bu yılın 12 ay × satış tutarı — bar chart için
 *   customerCount: number,
 * }}
 */
export function computeReports(customers) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth(); // 0..11

  let totalRevenue = 0;
  let monthRevenue = 0;
  let pendingReceivable = 0;

  // Bu yılın 12 ayı için satış tutarı dizisi
  const monthlySales = MONTH_LABELS_TR.map((label, i) => ({
    month: i,
    label,
    value: 0,
  }));

  const list = Array.isArray(customers) ? customers : [];

  for (const c of list) {
    const total = Number(c.totalAmount) || 0;
    const remaining = Number(c.remainingAmount) || 0;
    totalRevenue += total;
    pendingReceivable += remaining;

    // Müşterinin sipariş ayı — orderDate öncelikli, yoksa createdAt
    const ref = toDate(c.orderDate) || toDate(c.createdAt);
    if (!ref) continue;

    // Bu yılın aylık dağılımına ekle
    if (ref.getFullYear() === thisYear) {
      monthlySales[ref.getMonth()].value += total;
    }

    // İçinde bulunduğumuz aya eklendiyse → "Bu Ay Ciro"
    if (ref.getFullYear() === thisYear && ref.getMonth() === thisMonth) {
      monthRevenue += total;
    }
  }

  const collectedAmount = Math.max(totalRevenue - pendingReceivable, 0);
  const collectionRatio = totalRevenue > 0 ? collectedAmount / totalRevenue : 0;

  return {
    totalRevenue,
    monthRevenue,
    pendingReceivable,
    collectedAmount,
    collectionRatio,
    monthlySales,
    customerCount: list.length,
  };
}

// Para formatlama — geniş ekran için tam, dar ekran için kompakt
export function formatTL(n) {
  return (Number(n) || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' ₺';
}

// Kompakt format — milyon/milyar abbreviation. Bar chart Y axis ve büyük rakamlar için.
export function formatTLCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toLocaleString('tr-TR', {
      maximumFractionDigits: 2,
    }) + ' Mlr ₺';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toLocaleString('tr-TR', {
      maximumFractionDigits: 1,
    }) + ' Mn ₺';
  }
  if (num >= 10_000) {
    return (num / 1_000).toLocaleString('tr-TR', {
      maximumFractionDigits: 0,
    }) + ' B ₺';
  }
  return formatTL(num);
}
