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
