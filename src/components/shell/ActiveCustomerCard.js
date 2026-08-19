import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import SmartImage from '../ui/SmartImage';
import { LinearGradient } from 'expo-linear-gradient';
import useCustomers from '../../hooks/useCustomers';
import { paymentMethodLabel } from '../../services/customerService';
import CanvasViewerModal from './CanvasViewerModal';
import { formatPhoneTR } from '../../utils/format';
import { sendStaleReminder } from '../../utils/whatsapp';
import Alert from '../../utils/alert';
import { SIDE_BRIDE, SIDE_GROOM, SIDE_LABEL, SIDE_SHORT } from '../../utils/customerSides';
import { colors, gradients, radii, spacing, shadows } from '../../theme/colors';

// Eşik: bu kadar gün ödeme yoksa uyarı rozeti çık.
const PAYMENT_REMINDER_DAYS = 30;
// Yeni sipariş aktiflik süresi — sipariş tarihinden itibaren bu süre boyunca AKTİF
const ACTIVE_CUSTOMER_DAYS = 10;

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

// paymentHistory dizisinden en son ödeme tarihini bulur (Date)
function getLatestFromHistory(paymentHistory) {
  if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) return null;
  let max = null;
  for (const p of paymentHistory) {
    const d = toDate(p.at);
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

const daysAgo = (date) => {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const formatDateShort = (date) => {
  if (!date) return '—';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toLocaleUpperCase('tr');
};

// VIP eşikleri — biri sağlanırsa VIP sayılır.
const VIP_AMOUNT_THRESHOLD = 200000;
const VIP_HISTORY_THRESHOLD = 3;

export default function ActiveCustomerCard({ customer, onClear, onPayment, onEdit, onDelete }) {
  const { customers } = useCustomers(500);
  // Viewer state — hem canvas hem ölçü fotoğrafları için ortak.
  const [viewer, setViewer] = useState({
    open: false,
    images: [],
    index: 0,
    eyebrow: 'KAYITLI ÇİZİM',
    showDesignButton: true,
  });

  const openCanvasViewer = () => {
    setViewer({
      open: true,
      images: [customer.mediaUrl],
      index: 0,
      eyebrow: 'KAYITLI ÇİZİM',
      showDesignButton: false,
    });
  };

  const openPhotoViewer = (i) => {
    setViewer({
      open: true,
      images: customer.measurementPhotos || [],
      index: i,
      eyebrow: 'ÖLÇÜ FOTOĞRAFI',
      showDesignButton: false,
    });
  };

  const closeViewer = () => setViewer((v) => ({ ...v, open: false }));

  const history = useMemo(() => {
    if (!customer?.fullName) return [];
    const nameKey = customer.fullName.toLocaleLowerCase('tr');
    return customers.filter(
      (c) => (c.fullName || '').toLocaleLowerCase('tr') === nameKey
    );
  }, [customers, customer?.fullName]);

  if (!customer) return null;

  const isVip =
    (customer.totalAmount || 0) >= VIP_AMOUNT_THRESHOLD ||
    history.length >= VIP_HISTORY_THRESHOLD;

  // Aktif müşteri: sipariş tarihinden son 10 gün içinde
  const orderForActive = customer.orderDate?.toDate?.() || (customer.orderDate instanceof Date ? customer.orderDate : null);
  const daysFromOrder = orderForActive ? Math.floor((Date.now() - orderForActive.getTime()) / 86400000) : null;
  const isActive = daysFromOrder !== null && daysFromOrder >= 0 && daysFromOrder <= ACTIVE_CUSTOMER_DAYS;

  const canPay = (customer.remainingAmount || 0) > 0;
  const isSplitCustomer = !!customer.isSplit && customer.sides;

  // Ortak WhatsApp gönderici — her taraf için ayrı çağrılır.
  const sendWaForSide = async ({ name, phone, remainingDebt, daysSince, hasPayment }) => {
    if (!phone) {
      Alert.alert(
        'Telefon Yok',
        `${name} için kayıtlı telefon numarası bulunmuyor. Önce müşteri kartını düzenleyip telefonu ekle.`,
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }
    const result = await sendStaleReminder({
      customerName: name,
      phone,
      daysSince: daysSince || 0,
      hasPayment: !!hasPayment,
      remainingDebt,
    });
    if (!result.ok) {
      Alert.alert(
        'WhatsApp Açılamadı',
        result.reason || 'Bilinmeyen hata',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    }
  };

  const handleWhatsApp = async () => {
    if (!customer.phone) {
      Alert.alert(
        'Telefon Yok',
        `${customer.fullName} için kayıtlı telefon numarası bulunmuyor. Önce müşteri kartını düzenleyip telefonu ekle.`,
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }
    // Referans gün: son ödeme varsa ondan, yoksa sipariş tarihinden
    const daysSince = lastPay ? daysSincePay : daysSinceOrder;
    const result = await sendStaleReminder({
      customerName: customer.fullName,
      phone: customer.phone,
      daysSince: daysSince || 0,
      hasPayment: !!lastPay,
      remainingDebt: customer.remainingAmount,
    });
    if (!result.ok) {
      Alert.alert(
        'WhatsApp Açılamadı',
        result.reason || 'Bilinmeyen hata',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    }
  };

  const orderDate = toDate(customer.orderDate) || toDate(customer.createdAt);
  // lastPaymentAt boşsa paymentHistory'den en güncel ödemeyi bul (arşiv kayıtlarda
  // lastPaymentAt set edilmemiş olabilir).
  let lastPay = toDate(customer.lastPaymentAt);
  let lastPayMethod = customer.lastPaymentMethod;
  if (!lastPay && Array.isArray(customer.paymentHistory) && customer.paymentHistory.length > 0) {
    let maxDate = null;
    let maxMethod = null;
    for (const p of customer.paymentHistory) {
      const d = toDate(p.at);
      if (d && (!maxDate || d > maxDate)) {
        maxDate = d;
        maxMethod = p.method;
      }
    }
    lastPay = maxDate;
    lastPayMethod = lastPayMethod || maxMethod;
  }
  const daysSincePay = lastPay ? daysAgo(lastPay) : null;
  const daysSinceOrder = orderDate ? daysAgo(orderDate) : null;
  // Uyarı: borç var + son ödeme yok ya da çok eski.
  const needsReminder =
    canPay &&
    (
      (daysSincePay !== null && daysSincePay >= PAYMENT_REMINDER_DAYS) ||
      (daysSincePay === null && daysSinceOrder !== null && daysSinceOrder >= PAYMENT_REMINDER_DAYS)
    );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>
          {isActive ? 'AKTİF MÜŞTERİ' : 'MÜŞTERİ'}
        </Text>
        <View style={styles.headerActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.headerBtn}>
              <Text style={styles.headerBtnTxt}>Düzenle</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={[styles.headerBtn, styles.headerBtnDanger]}>
              <Text style={[styles.headerBtnTxt, styles.headerBtnTxtDanger]}>Sil</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.identityRow}>
        <View style={[styles.avatar, isVip && styles.avatarVip]}>
          <Text style={styles.avatarTxt}>{initials(customer.fullName)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{customer.fullName || '—'}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeTxt}>YENİ</Text>
              </View>
            )}
            {isVip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipTxt}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.contact} numberOfLines={1}>
            {customer.phone ? formatPhoneTR(customer.phone) : 'Telefon yok'}
          </Text>
          {history.length > 1 && (
            <Text style={styles.historyTxt}>{history.length} işlem geçmişi</Text>
          )}
        </View>
      </View>

      {/* ─── SPLIT (Kız/Erkek tarafı) görünüm ─── */}
      {isSplitCustomer && (
        <>
          <SidePaymentBlock
            sideKey={SIDE_BRIDE}
            side={customer.sides.bride}
            label={SIDE_LABEL[SIDE_BRIDE]}
            accent={colors.gold}
            customerName={customer.fullName}
            orderDate={orderDate}
            onWhatsApp={() => {
              const b = customer.sides.bride;
              const bLastPay = toDate(b.lastPaymentAt) || getLatestFromHistory(b.paymentHistory);
              const bDaysSince = bLastPay ? daysAgo(bLastPay) : daysSinceOrder;
              sendWaForSide({
                name: `${customer.fullName} (${SIDE_SHORT[SIDE_BRIDE]})`,
                phone: b.phone,
                remainingDebt: b.remainingAmount || 0,
                daysSince: bDaysSince,
                hasPayment: !!bLastPay,
              });
            }}
            onPayment={() => onPayment?.(SIDE_BRIDE)}
          />
          <SidePaymentBlock
            sideKey={SIDE_GROOM}
            side={customer.sides.groom}
            label={SIDE_LABEL[SIDE_GROOM]}
            accent={colors.info}
            customerName={customer.fullName}
            orderDate={orderDate}
            onWhatsApp={() => {
              const g = customer.sides.groom;
              const gLastPay = toDate(g.lastPaymentAt) || getLatestFromHistory(g.paymentHistory);
              const gDaysSince = gLastPay ? daysAgo(gLastPay) : daysSinceOrder;
              sendWaForSide({
                name: `${customer.fullName} (${SIDE_SHORT[SIDE_GROOM]})`,
                phone: g.phone,
                remainingDebt: g.remainingAmount || 0,
                daysSince: gDaysSince,
                hasPayment: !!gLastPay,
              });
            }}
            onPayment={() => onPayment?.(SIDE_GROOM)}
          />
        </>
      )}

      {/* ─── Tekli görünüm (split değilse) ─── */}
      {!isSplitCustomer && (
      <>
      {/* Sipariş + son ödeme bilgileri */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>SİPARİŞ</Text>
          <Text style={styles.metaValue}>{formatDateShort(orderDate)}</Text>
          {daysSinceOrder !== null && (
            <Text style={styles.metaHint}>{daysSinceOrder} gün önce</Text>
          )}
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>SON ÖDEME</Text>
          {lastPay ? (
            <>
              <Text style={styles.metaValue}>{formatDateShort(lastPay)}</Text>
              <Text style={[styles.metaHint, needsReminder && styles.metaHintAlert]}>
                {daysSincePay} gün önce {lastPayMethod ? `· ${paymentMethodLabel(lastPayMethod)}` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.metaValue, { color: colors.textMuted }]}>—</Text>
              <Text style={styles.metaHint}>Hiç ödeme yok</Text>
            </>
          )}
        </View>
      </View>

      {needsReminder && (
        <View style={styles.reminderBanner}>
          <View style={styles.reminderBar} />
          <Text style={styles.reminderTxt}>
            {daysSincePay !== null
              ? `${daysSincePay} gündür ödeme yok — hatırlatma yapılabilir`
              : `Sipariş üzerinden ${daysSinceOrder} gün geçti, hiç ödeme alınmamış`}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>HESAP ÖZETİ</Text>

      {/* Toplam tutar */}
      <View style={styles.summaryLine}>
        <Text style={styles.summaryLineLabel}>Toplam Tutar</Text>
        <Text style={styles.summaryLineValue}>{formatTL(customer.totalAmount)}</Text>
      </View>

      {/* İlk peşinat (sipariş günü) */}
      <View style={styles.summaryLine}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLineLabel}>İlk Peşinat</Text>
          {orderDate && (
            <Text style={styles.summaryLineSub}>{formatDateShort(orderDate)} · sipariş günü</Text>
          )}
        </View>
        <Text style={styles.summaryLineValue}>− {formatTL(customer.deposit)}</Text>
      </View>

      {/* Taksitler — paymentHistory listesi */}
      {Array.isArray(customer.paymentHistory) && customer.paymentHistory.length > 0 && (
        <View style={styles.installmentsBlock}>
          <Text style={styles.installmentsTitle}>
            TAKSİTLER ({customer.paymentHistory.length})
          </Text>
          {customer.paymentHistory
            .slice()
            .sort((a, b) => {
              const ta = toDate(a.at)?.getTime() || 0;
              const tb = toDate(b.at)?.getTime() || 0;
              return ta - tb;
            })
            .map((p, i) => {
              const d = toDate(p.at);
              return (
                <View key={i} style={styles.installmentRow}>
                  <View style={styles.installmentBullet}>
                    <Text style={styles.installmentBulletTxt}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.installmentDate}>{formatDateShort(d)}</Text>
                    <Text style={styles.installmentMethod}>
                      {paymentMethodLabel(p.method)}
                      {p.note ? `  ·  ${p.note}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.installmentAmount}>− {formatTL(p.amount)}</Text>
                </View>
              );
            })}
        </View>
      )}

      {/* Kalan borç — büyük, kırmızı, en altta vurgulu */}
      <View style={styles.remainingBlock}>
        <View>
          <Text style={styles.remainingLabel}>KALAN BORÇ</Text>
          <Text style={styles.remainingHint}>
            {customer.paymentHistory?.length
              ? `${customer.paymentHistory.length} taksit ödendi`
              : customer.plannedInstallments
                ? `${customer.plannedInstallments} taksit planlandı`
                : 'Henüz taksit yok'}
          </Text>
        </View>
        <Text style={styles.remainingValue}>{formatTL(customer.remainingAmount)}</Text>
      </View>
      </>
      )}

      {!!customer.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>NOT</Text>
          <Text style={styles.notesText}>{customer.notes}</Text>
        </View>
      )}

      {!!customer.mediaUrl && (
        <View style={styles.canvasSection}>
          <Text style={styles.sectionLabel}>KAYITLI ÇİZİM</Text>
          <TouchableOpacity
            style={styles.canvasPreviewWrap}
            onPress={openCanvasViewer}
            activeOpacity={0.85}
          >
            <SmartImage
              source={{ uri: customer.mediaUrl }}
              style={styles.canvasPreview}
              resizeMode="contain"
            />
            <View style={styles.expandIcon}>
              <Text style={styles.expandIconTxt}>Büyüt</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <CanvasViewerModal
        visible={viewer.open}
        images={viewer.images}
        initialIndex={viewer.index}
        customerName={customer.fullName}
        eyebrow={viewer.eyebrow}
        showDesignButton={viewer.showDesignButton}
        onClose={closeViewer}
      />

      {Array.isArray(customer.measurementPhotos) && customer.measurementPhotos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.sectionLabel}>
            ÖLÇÜ FOTOĞRAFLARI ({customer.measurementPhotos.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
            {customer.measurementPhotos.map((url, i) => (
              <TouchableOpacity
                key={`${url}-${i}`}
                style={styles.photoThumb}
                onPress={() => openPhotoViewer(i)}
                activeOpacity={0.85}
              >
                <SmartImage source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
                <View style={styles.photoIndex}>
                  <Text style={styles.photoIndexTxt}>{i + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!isSplitCustomer && (
      <View style={styles.actionsRow}>
        {canPay && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleWhatsApp}
            style={styles.waActionBtn}
          >
            <LinearGradient
              colors={['#25D366', '#1EB055']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.waActionTxt}>WhatsApp Hatırlat</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={canPay ? 0.85 : 1}
          onPress={canPay ? () => onPayment?.() : null}
          disabled={!canPay}
          style={styles.payActionBtn}
        >
          <LinearGradient
            colors={canPay ? gradients.goldButton : ['#3A3F50', '#2A2F3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.payBtn}
          >
            <Text style={[
              styles.payBtnTxt,
              !canPay && { color: colors.textMuted },
            ]}>
              {canPay ? 'Ödeme Al' : 'Tamamı Ödendi'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
}

// ─── Split modu: tek taraf (kız veya erkek) için özet + aksiyon ───
function SidePaymentBlock({ side, label, accent, customerName, orderDate, onWhatsApp, onPayment }) {
  if (!side) return null;
  const sideRemaining = side.remainingAmount || 0;
  const sideCanPay = sideRemaining > 0;
  const sideLastPay = toDate(side.lastPaymentAt) || getLatestFromHistory(side.paymentHistory);
  const sideDaysSincePay = sideLastPay ? daysAgo(sideLastPay) : null;

  const historyCount = Array.isArray(side.paymentHistory) ? side.paymentHistory.length : 0;

  return (
    <View style={[splitStyles.block, { borderLeftColor: accent }]}>
      <View style={splitStyles.header}>
        <Text style={[splitStyles.label, { color: accent }]}>{label}</Text>
        {!!side.phone && (
          <Text style={splitStyles.phone}>{formatPhoneTR(side.phone)}</Text>
        )}
      </View>

      {/* Meta: son ödeme */}
      <View style={splitStyles.metaRow}>
        <Text style={splitStyles.metaLabel}>SON ÖDEME</Text>
        {sideLastPay ? (
          <Text style={splitStyles.metaValue}>
            {formatDateShort(sideLastPay)} · {sideDaysSincePay} gün önce
          </Text>
        ) : (
          <Text style={[splitStyles.metaValue, { color: colors.textMuted }]}>Hiç ödeme yok</Text>
        )}
      </View>

      {/* Hesap özeti */}
      <View style={splitStyles.summaryRow}>
        <Text style={splitStyles.summaryTxt}>Bu tarafın toplamı: <Text style={splitStyles.summaryBold}>{formatTL(side.totalAmount)}</Text></Text>
      </View>
      {(side.deposit || 0) > 0 && (
        <View style={splitStyles.summaryRow}>
          <Text style={splitStyles.summaryTxt}>Peşinat: − {formatTL(side.deposit)}</Text>
        </View>
      )}
      {historyCount > 0 && (
        <View style={splitStyles.summaryRow}>
          <Text style={splitStyles.summaryTxt}>{historyCount} taksit ödendi</Text>
        </View>
      )}

      {/* Kalan borç — büyük */}
      <View style={[splitStyles.remainingBox, { borderColor: accent }]}>
        <Text style={[splitStyles.remainingLabel, { color: accent }]}>KALAN BORÇ</Text>
        <Text style={[splitStyles.remainingValue, { color: sideCanPay ? colors.danger : colors.success }]}>
          {formatTL(sideRemaining)}
        </Text>
      </View>

      {/* Aksiyonlar */}
      <View style={splitStyles.actions}>
        {sideCanPay && (
          <TouchableOpacity activeOpacity={0.85} onPress={onWhatsApp} style={splitStyles.waBtn}>
            <LinearGradient
              colors={['#25D366', '#1EB055']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={splitStyles.waBtnTxt}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={sideCanPay ? 0.85 : 1}
          onPress={sideCanPay ? onPayment : null}
          disabled={!sideCanPay}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={sideCanPay ? gradients.goldButton : ['#3A3F50', '#2A2F3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={splitStyles.payBtn}
          >
            <Text style={[splitStyles.payBtnTxt, !sideCanPay && { color: colors.textMuted }]}>
              {sideCanPay ? 'Ödeme Al' : 'Ödendi'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const splitStyles = StyleSheet.create({
  block: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftColor: colors.gold,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  phone: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  metaLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  metaValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  summaryRow: { paddingVertical: 3 },
  summaryTxt: { fontSize: 12, color: colors.textSecondary },
  summaryBold: { color: colors.textPrimary, fontWeight: '800' },
  remainingBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(226,92,92,0.08)',
    alignItems: 'center',
  },
  remainingLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  remainingValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  waBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  waBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  payBtn: {
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.30)',
    backgroundColor: 'rgba(92, 13, 20, 0.16)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 11, color: colors.gold, fontWeight: '900', letterSpacing: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  headerBtnDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(226,92,92,0.4)',
  },
  headerBtnTxt: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  headerBtnTxtDanger: { color: colors.danger },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTxt: { color: colors.textSecondary, fontSize: 12 },

  notesBox: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(201, 169, 97, 0.10)',
    borderColor: 'rgba(201, 169, 97, 0.35)',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  notesText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },

  identityRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  avatarVip: { borderColor: colors.gold, borderWidth: 2.5 },
  avatarTxt: { color: colors.textPrimary, fontWeight: '800', fontSize: 17, letterSpacing: 1 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 17, flexShrink: 1 },
  vipBadge: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vipTxt: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  activeBadge: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeTxt: { color: colors.success, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  contact: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  historyTxt: { color: colors.textMuted, fontSize: 11, marginTop: 4, fontWeight: '600' },

  divider: {
    height: 1,
    backgroundColor: 'rgba(201, 169, 97, 0.20)',
    marginVertical: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  amountBlock: { alignItems: 'flex-start' },
  amountBig: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
  amountBigLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },

  amountRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  smallLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  amountSm: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  amountDanger: { color: colors.danger },

  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLineLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  summaryLineSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  summaryLineValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },

  installmentsBlock: { marginTop: spacing.md },
  installmentsTitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  installmentBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(201,169,97,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  installmentBulletTxt: { color: colors.gold, fontWeight: '900', fontSize: 10 },
  installmentDate: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  installmentMethod: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  installmentAmount: { color: colors.success, fontWeight: '800', fontSize: 14 },

  remainingBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 169, 97, 0.28)',
  },
  remainingLabel: { fontSize: 11, color: colors.danger, fontWeight: '900', letterSpacing: 2 },
  remainingHint: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  remainingValue: { fontSize: 28, color: colors.danger, fontWeight: '900', letterSpacing: -0.5 },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  payActionBtn: { flex: 1 },
  payBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  waActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#25D366',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  waActionTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  photosSection: { marginTop: spacing.lg },
  photosRow: { gap: spacing.sm, paddingRight: 4 },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoIndex: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  photoIndexTxt: { color: colors.gold, fontWeight: '800', fontSize: 9 },

  canvasSection: { marginTop: spacing.md },
  canvasPreviewWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    aspectRatio: 1.4,
    marginTop: spacing.sm,
    position: 'relative',
  },
  canvasPreview: { width: '100%', height: '100%' },
  expandIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIconTxt: { color: colors.gold, fontSize: 11, fontWeight: '800' },

  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  metaValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '700', marginTop: 2 },
  metaHint: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  metaHintAlert: { color: colors.warning, fontWeight: '700' },
  metaDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    marginTop: spacing.sm,
    gap: 10,
    overflow: 'hidden',
  },
  reminderBar: { width: 4, alignSelf: 'stretch', backgroundColor: colors.warning },
  reminderTxt: { flex: 1, color: colors.warning, fontWeight: '700', fontSize: 12 },
});
