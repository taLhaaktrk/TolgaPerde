import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import SmartImage from '../ui/SmartImage';
import { LinearGradient } from 'expo-linear-gradient';
import useCustomers from '../../hooks/useCustomers';
import { paymentMethodLabel } from '../../services/customerService';
import CanvasViewerModal from './CanvasViewerModal';
import { formatPhoneTR } from '../../utils/format';
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
    <View style={[styles.card, shadows.md]}>
      <LinearGradient
        colors={gradients.customerCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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

      <TouchableOpacity
        activeOpacity={canPay ? 0.85 : 1}
        onPress={canPay ? onPayment : null}
        disabled={!canPay}
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '800', letterSpacing: 1.5 },
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
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1.5,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radii.sm,
    marginBottom: 4,
    gap: 10,
  },
  installmentBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installmentBulletTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 11 },
  installmentDate: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  installmentMethod: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  installmentAmount: { color: colors.success, fontWeight: '800', fontSize: 14 },

  remainingBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(226,92,92,0.4)',
  },
  remainingLabel: { fontSize: 10, color: colors.danger, fontWeight: '800', letterSpacing: 1.5 },
  remainingHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  remainingValue: { fontSize: 22, color: colors.danger, fontWeight: '900' },

  payBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  payBtnTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

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
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
