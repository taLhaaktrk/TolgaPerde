// Kız tarafı / Erkek tarafı split feature — ortak yardımcılar.
//
// Veri modeli:
//   customer.isSplit          → boolean (varsayılan false)
//   customer.sides.bride      → { phone, totalAmount, deposit, remainingAmount,
//                                  paymentHistory[], installmentPlan[], plannedInstallments }
//   customer.sides.groom      → aynı şekil
//
// isSplit=false müşteriler: eski akışla devam eder, sides yok, top-level fieldlar
// (customer.phone, customer.totalAmount, customer.paymentHistory, vs.) kullanılır.
//
// isSplit=true müşteriler:
//   - Top-level totalAmount/deposit/remainingAmount = iki tarafın toplamı (istatistikler için)
//   - Top-level phone = kız tarafının telefonu (yoksa erkek)
//   - Top-level paymentHistory = birleştirilmiş liste (her entry'de side tagı ile)
//   - Detaylı işlemler sides.bride / sides.groom üzerinden yürür.

export const SIDE_BRIDE = 'bride';
export const SIDE_GROOM = 'groom';

export const SIDE_LABEL = {
  [SIDE_BRIDE]: 'Kız Tarafı',
  [SIDE_GROOM]: 'Erkek Tarafı',
};

export const SIDE_SHORT = {
  [SIDE_BRIDE]: 'Kız',
  [SIDE_GROOM]: 'Erkek',
};

// Müşteri split mi?
export function isSplit(customer) {
  return !!customer?.isSplit;
}

// Belirli bir tarafın verisini döndür.
// Split değilse ve side=null istendiyse: top-level "sanki tek taraf" nesnesi.
export function getSide(customer, sideKey) {
  if (!customer) return null;
  if (isSplit(customer)) {
    return customer.sides?.[sideKey] || null;
  }
  // Split değil → sanal tek taraf (side bilgisi olmadan)
  if (sideKey) return null;
  return {
    phone: customer.phone || '',
    totalAmount: customer.totalAmount || 0,
    deposit: customer.deposit || 0,
    remainingAmount: customer.remainingAmount || 0,
    paymentHistory: customer.paymentHistory || [],
    installmentPlan: customer.installmentPlan || [],
    plannedInstallments: customer.plannedInstallments || 0,
  };
}

// Tüm tarafları liste olarak döndür — split ise [bride, groom], değilse [main].
export function getAllSides(customer) {
  if (!customer) return [];
  if (isSplit(customer)) {
    const arr = [];
    if (customer.sides?.bride) arr.push({ key: SIDE_BRIDE, label: SIDE_LABEL[SIDE_BRIDE], ...customer.sides.bride });
    if (customer.sides?.groom) arr.push({ key: SIDE_GROOM, label: SIDE_LABEL[SIDE_GROOM], ...customer.sides.groom });
    return arr;
  }
  return [{ key: null, label: null, ...getSide(customer, null) }];
}

// İki tarafın belirli bir sayısal alanını topla.
export function sumSides(customer, field) {
  if (!isSplit(customer)) return Number(customer?.[field]) || 0;
  const b = Number(customer.sides?.bride?.[field]) || 0;
  const g = Number(customer.sides?.groom?.[field]) || 0;
  return b + g;
}

// Kayıt için sides objesi oluştur (kaydetme öncesi form → firestore dönüşümü).
// Girdi: { bridePhone, brideTotal, brideDeposit, brideRemaining, bridePlannedCount, bridePaymentHistory, brideInstallmentPlan,
//          groomPhone, groomTotal, ... aynısı groom için }
export function buildSidesPayload({
  bride,
  groom,
}) {
  return {
    bride: {
      phone: bride.phone || '',
      totalAmount: Number(bride.totalAmount) || 0,
      deposit: Number(bride.deposit) || 0,
      remainingAmount: Number(bride.remainingAmount) || 0,
      plannedInstallments: Number(bride.plannedInstallments) || 0,
      paymentHistory: bride.paymentHistory || [],
      installmentPlan: bride.installmentPlan || [],
    },
    groom: {
      phone: groom.phone || '',
      totalAmount: Number(groom.totalAmount) || 0,
      deposit: Number(groom.deposit) || 0,
      remainingAmount: Number(groom.remainingAmount) || 0,
      plannedInstallments: Number(groom.plannedInstallments) || 0,
      paymentHistory: groom.paymentHistory || [],
      installmentPlan: groom.installmentPlan || [],
    },
  };
}
