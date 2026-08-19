// TolgaPerde — WhatsApp Click-to-Chat hatırlatma yardımcısı.
// Cross-platform: iOS/Android → Linking API, Web/Electron → window.open

import { Linking, Platform } from 'react-native';

// ════════════════════════════════════════════════════════════════
// ⚙️  İŞLETME IBAN — hatırlatma mesajına otomatik eklenir.
// Boş bırakırsan ('' yap) IBAN satırı mesajda gözükmez.
// Banka adı + IBAN'ı aynı satıra yazmak en temizi.
// ════════════════════════════════════════════════════════════════
const BUSINESS_IBAN = 'TEB BANKASI — TR940003200000000076051758 — Tolga Tosun ';
// ════════════════════════════════════════════════════════════════

// TR telefon numarasını wa.me'nin beklediği uluslararası formata çevir.
// Girdiler: "05511009340" / "+90 551 100 9340" / "5511009340" / "905511009340"
// Çıktı: "905511009340" (12 hane: ülke kodu 90 + 10 hane TR mobil)
// Geçersiz ise null.
export function normalizePhoneTR(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('90')) {
    // Zaten ülke kodu var (örn. "905XXXXXXXXX")
  } else if (digits.startsWith('0')) {
    // 05XXXXXXXXX → 905XXXXXXXXX
    digits = '90' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('5')) {
    // 5XXXXXXXXX → 905XXXXXXXXX
    digits = '90' + digits;
  } else {
    return null; // tanınmayan format
  }

  if (digits.length !== 12 || !digits.startsWith('905')) return null;
  return digits;
}

// Görüntülenebilir tutar formatı (mesajda kullanılır).
function formatAmount(amount) {
  return (Number(amount) || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Görüntülenebilir tarih formatı (DD.MM.YYYY).
function formatDate(dueDate) {
  if (!dueDate) return '';
  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (isNaN(d.getTime())) return String(dueDate);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Gün sayısını "12 gün" / "X ay Y gün" formatına çevir.
// < 30 → "12 gün"; >= 30 → "6 ay 11 gün" (kalan 0 ise sadece "X ay")
export function formatOverdueDuration(days) {
  const g = typeof days === 'number' && days > 0 ? Math.floor(days) : 0;
  if (g < 30) return `${g} gün`;
  const ay = Math.floor(g / 30);
  const kalan = g % 30;
  if (kalan === 0) return `${ay} ay`;
  return `${ay} ay ${kalan} gün`;
}

// Hatırlatma mesaj şablonu — samimi & rahatlatıcı ton.
// Opsiyonel parametreler: installmentNo, totalInstallments, remainingDebt, daysOverdue
// daysOverdue >= 30 ise "uzun gecikme" varyantı kullanılır (daha kibar ton).
export function buildReminderMessage({
  customerName,
  amount,
  dueDate,
  installmentNo,
  totalInstallments,
  remainingDebt,
  daysOverdue,
}) {
  const ad = customerName || '';
  const tutar = formatAmount(amount);
  const tarih = formatDate(dueDate);

  // 30+ gün geciken müşteriler için ayrı kibar ton
  const isLongOverdue = typeof daysOverdue === 'number' && daysOverdue >= 30;

  // Açılış cümlesi
  let opening;
  if (isLongOverdue && installmentNo && totalInstallments) {
    // Uzun gecikme — kibar ama net hatırlatma
    opening = `Sayın ${ad}, Tolga Perde olarak ödeme planınız hakkında bilgi vermek istedik. Toplam ${totalInstallments} taksitlik ödeme planınızda ${installmentNo}. taksitiniz ${daysOverdue} gündür beklemektedir. Bu taksitin tutarı ${tutar} TL'dir.`;
  } else if (isLongOverdue) {
    opening = `Sayın ${ad}, Tolga Perde olarak ödeme planınız hakkında bilgi vermek istedik. Sıradaki taksit ödemeniz ${daysOverdue} gündür beklemektedir. Bu taksitin tutarı ${tutar} TL'dir.`;
  } else if (installmentNo && totalInstallments) {
    opening = `Sayın ${ad}, Tolga Perde'mizi tercih ettiğiniz için teşekkür ederiz. Toplam ${totalInstallments} taksitlik ödeme planınızda ${installmentNo}. taksit ödemenizin tutarı ${tutar} TL olup vadesi ${tarih} tarihindedir.`;
  } else {
    opening = `Sayın ${ad}, Tolga Perde'mizi tercih ettiğiniz için teşekkür ederiz. Sıradaki taksit ödemenizin tutarı ${tutar} TL olup vadesi ${tarih} tarihindedir.`;
  }

  // Opsiyonel: kalan borç satırı
  const kalanSatiri =
    typeof remainingDebt === 'number' && remainingDebt > 0
      ? ` Kalan toplam bakiyeniz: ${formatAmount(remainingDebt)} TL.`
      : '';

  // Opsiyonel: IBAN bloğu (boşsa eklenmez)
  const ibanBlogu = BUSINESS_IBAN
    ? `\n\nİşletme IBAN: ${BUSINESS_IBAN}`
    : '';

  // Kapanış
  const closing = `\n\nAnlayışınız için teşekkür eder, iyi günler dileriz.`;

  return `${opening}${kalanSatiri}${ibanBlogu}${closing}`;
}

// ═══════════════════════════════════════════════════════════════
// SENARYO 1 — YENİ müşteri (2026-07-01+), Yaklaşan Taksitler'den WA
// Her geciken taksit ayrı satır listelenir. 3 kademe ton (en eski
// geciken taksitin gün sayısına göre otomatik değişir):
//   0-30  → standart kibar
//   31-60 → net ama saygılı ("sizi tekrar bilgilendirmek istedik")
//   61+   → ciddi + "görüşmek/yapılandırma için bize ulaşın"
// ═══════════════════════════════════════════════════════════════
export function buildDetailedInstallmentMessage({
  customerName,
  overdueInstallments, // [{ installmentNo, tutar, dueDate, daysOverdue }]
  remainingDebt,
}) {
  const ad = customerName || '';
  const items = Array.isArray(overdueInstallments) ? overdueInstallments : [];
  if (items.length === 0) return '';

  // En eski geciken taksitin gün sayısı → ton kademesi
  const maxDays = items.reduce((m, it) => Math.max(m, Number(it.daysOverdue) || 0), 0);

  let opening, closing;
  if (maxDays >= 61) {
    // 3. kademe — son hatırlatma, ciddi ton
    opening = `Sayın ${ad}, Tolga Perde olarak ödeme planınızla ilgili son bir hatırlatma yapmak istiyoruz. Aşağıdaki taksitleriniz uzun süredir beklemektedir:`;
    closing = `\n\nBu konuda görüşmek veya ödeme planınızı yeniden yapılandırmak için bizimle iletişime geçebilirsiniz. Anlayışınız için teşekkür ederiz.`;
  } else if (maxDays >= 31) {
    // 2. kademe — net ama saygılı
    opening = `Sayın ${ad}, Tolga Perde olarak sizi tekrar bilgilendirmek istedik. Aşağıdaki taksitlerinizin vadesi geçmiş, ödeme beklenmektedir:`;
    closing = `\n\nÖdemeleriniz için anlayışınızı bekliyor, iyi günler dileriz.`;
  } else {
    // 1. kademe — standart kibar
    opening = `Sayın ${ad}, Tolga Perde'mizi tercih ettiğiniz için teşekkür ederiz. Aşağıdaki taksitlerinizin vadesi geçmiş olup ödeme beklenmektedir:`;
    closing = `\n\nAnlayışınız için teşekkür eder, iyi günler dileriz.`;
  }

  const list = items
    .map((it) => {
      const tarih = formatDate(it.dueDate);
      const gecikme = formatOverdueDuration(it.daysOverdue);
      const noStr = it.installmentNo ? `${it.installmentNo}. taksit — ` : '';
      return `• ${noStr}${formatAmount(it.tutar)} TL — vade ${tarih} — ${gecikme} gecikme`;
    })
    .join('\n');

  const totalOverdue = items.reduce((s, it) => s + (Number(it.tutar) || 0), 0);
  const summary = `\n\nToplam geciken tutar: ${formatAmount(totalOverdue)} TL`;
  const kalanSatiri =
    typeof remainingDebt === 'number' && remainingDebt > 0
      ? `\nKalan bakiyeniz: ${formatAmount(remainingDebt)} TL`
      : '';

  const iban = BUSINESS_IBAN ? `\n\nİşletme IBAN: ${BUSINESS_IBAN}` : '';

  return `${opening}\n\n${list}${summary}${kalanSatiri}${iban}${closing}`;
}

// ═══════════════════════════════════════════════════════════════
// SENARYO 2 & 3 — Hatırlatma (Uzun süre iletişimsiz) → ESKİ müşteri
// Senaryo 2: aktif taksit planı VAR + geciken taksit sayısı belli
//   → "{N} taksittir {gün} gündür ödeme yapmadınız"
// Senaryo 3: taksit planı YOK ya da plan süresi AŞILMIŞ (son taksit vadesi geçti)
//   → sadece süre: "{gün} ödeme yapmadınız" (taksit numaralamak anlamsız)
// ═══════════════════════════════════════════════════════════════
export function buildStaleReminderMessage({
  customerName,
  daysSince,               // Senaryo 3: son ödeme/sipariş üstünden gün
  hasPayment,
  remainingDebt,
  overdueInstallmentCount, // Senaryo 2: geciken taksit sayısı
  oldestOverdueDays,       // Senaryo 2: en eski geciken vadeden gün
  planExceeded,            // true → Senaryo 3'e düş (plan süresi aşıldı)
}) {
  const ad = customerName || '';

  // Senaryo 2 koşulu: geciken taksit sayısı > 0 VE plan süresi aşılmamış
  const isScenario2 =
    typeof overdueInstallmentCount === 'number' &&
    overdueInstallmentCount > 0 &&
    typeof oldestOverdueDays === 'number' &&
    oldestOverdueDays > 0 &&
    !planExceeded;

  let opening;
  if (isScenario2) {
    // Senaryo 2 — plan içi geciken taksit özeti
    const durStr = formatOverdueDuration(oldestOverdueDays);
    opening = `Sayın ${ad}, Tolga Perde olarak ödeme planınız hakkında bilgi vermek istedik. ${overdueInstallmentCount} taksittir ${durStr} ödeme yapmadınız.`;
  } else {
    // Senaryo 3 — sadece süre
    const g = typeof daysSince === 'number' && daysSince > 0 ? daysSince : 0;
    const durStr = formatOverdueDuration(g);
    if (hasPayment) {
      opening = `Sayın ${ad}, Tolga Perde olarak bilgi vermek istedik. Son ödemenizden bu yana ${durStr} ödeme yapmadınız.`;
    } else {
      opening = `Sayın ${ad}, Tolga Perde olarak siparişiniz hakkında bilgi vermek istedik. Siparişinizin üzerinden ${durStr} geçmiş, henüz tarafımıza bir ödeme ulaşmamıştır.`;
    }
  }

  const kalanSatiri =
    typeof remainingDebt === 'number' && remainingDebt > 0
      ? ` Kalan bakiyeniz: ${formatAmount(remainingDebt)} TL'dir.`
      : '';

  const ibanBlogu = BUSINESS_IBAN ? `\n\nİşletme IBAN: ${BUSINESS_IBAN}` : '';
  const closing = `\n\nAnlayışınız için teşekkür eder, iyi günler dileriz.`;

  return `${opening}${kalanSatiri}${ibanBlogu}${closing}`;
}

/**
 * Stale reminder — Hatırlatma listesi (ESKİ müşteriler). Senaryo 2 (plan
 * içi geciken taksit özeti) veya Senaryo 3 (sadece süre).
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function sendStaleReminder({
  customerName,
  phone,
  daysSince,
  hasPayment,
  remainingDebt,
  overdueInstallmentCount,
  oldestOverdueDays,
  planExceeded,
}) {
  const normalized = normalizePhoneTR(phone);
  if (!normalized) {
    return { ok: false, reason: 'Geçersiz telefon — uluslararası formata çevrilemedi.' };
  }
  const message = buildStaleReminderMessage({
    customerName,
    daysSince,
    hasPayment,
    remainingDebt,
    overdueInstallmentCount,
    oldestOverdueDays,
    planExceeded,
  });
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return { ok: false, reason: 'WhatsApp bu cihazda açılamıyor.' };
      await Linking.openURL(url);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || 'Bilinmeyen hata' };
  }
}

/**
 * Detaylı taksit hatırlatması — Yaklaşan Taksitler listesi (YENİ müşteriler).
 * Tüm geciken taksitleri liste halinde yollar + 3 kademe ton eskalasyonu.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function sendDetailedInstallmentReminder({
  customerName,
  phone,
  overdueInstallments,
  remainingDebt,
}) {
  const normalized = normalizePhoneTR(phone);
  if (!normalized) {
    return { ok: false, reason: 'Geçersiz telefon — uluslararası formata çevrilemedi.' };
  }
  const message = buildDetailedInstallmentMessage({
    customerName,
    overdueInstallments,
    remainingDebt,
  });
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return { ok: false, reason: 'WhatsApp bu cihazda açılamıyor.' };
      await Linking.openURL(url);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || 'Bilinmeyen hata' };
  }
}

/**
 * WhatsApp Click-to-Chat linkini aç.
 * Mobilde WhatsApp uygulamasını, masaüstünde wa.me sayfasını (oradan WhatsApp Desktop/Web'e geçer).
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function sendWhatsAppReminder({
  customerName,
  phone,
  amount,
  dueDate,
  installmentNo,
  totalInstallments,
  remainingDebt,
  daysOverdue,
}) {
  const normalized = normalizePhoneTR(phone);
  if (!normalized) {
    return { ok: false, reason: 'Geçersiz telefon — uluslararası formata çevrilemedi.' };
  }
  const message = buildReminderMessage({
    customerName,
    amount,
    dueDate,
    installmentNo,
    totalInstallments,
    remainingDebt,
    daysOverdue,
  });
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;

  try {
    if (Platform.OS === 'web') {
      // Web tarayıcı + Electron renderer için.
      // Electron'da desktop/main.js'deki setWindowOpenHandler bu linki OS default
      // tarayıcısına yönlendirir → tarayıcı whatsapp:// protokolünü tetikler →
      // WhatsApp Desktop açılır. (noopener KOYMA — Electron handler'ı tetiklemez,
      // ayrıca null return popup-block ile karışır.)
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } else {
      // iOS / Android: yüklüyse WhatsApp uygulaması açılır
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        return { ok: false, reason: 'WhatsApp bu cihazda açılamıyor.' };
      }
      await Linking.openURL(url);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || 'Bilinmeyen hata' };
  }
}
