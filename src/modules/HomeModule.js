import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import ModuleHeader from '../components/shell/ModuleHeader';
import Dropdown from '../components/ui/Dropdown';
import Alert from '../utils/alert';
import useCustomers from '../hooks/useCustomers';
import useDeviceType from '../hooks/useDeviceType';
import {
  useAppShell,
  MODULE_CUSTOMERS,
} from '../context/AppShellContext';
import { getInstallmentStatus } from '../utils/installments';
import { sendWhatsAppReminder } from '../utils/whatsapp';
import {
  dismissInstallmentReminder,
  dismissAttentionReminder,
} from '../services/customerService';
import { colors, gradients, spacing, radii, shadows } from '../theme/colors';

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

const daysAgo = (date) => {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
};

// Hatırlatma süresi seçenekleri — ay/yıl etiketli, gün değerli
const REMINDER_OPTIONS = [
  { label: '1 ay',    value: 30 },
  { label: '2 ay',    value: 60 },
  { label: '3 ay',    value: 90 },
  { label: '6 ay',    value: 180 },
  { label: '9 ay',    value: 270 },
  { label: '1 yıl',   value: 365 },
  { label: '1.5 yıl', value: 547 },
  { label: '2 yıl',   value: 730 },
];

const labelForDays = (days) =>
  REMINDER_OPTIONS.find((o) => o.value === days)?.label || `${days} gün`;

export default function HomeModule() {
  const { customers, loading } = useCustomers(500);
  const { setActiveModule, setActiveCustomer } = useAppShell();
  const { isPhone } = useDeviceType();
  const [threshold, setThreshold] = useState(30); // gün cinsinden, varsayılan 1 ay

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => (c.remainingAmount || 0) > 0);
    const totalDebt = debtors.reduce((s, c) => s + (c.remainingAmount || 0), 0);
    return {
      count: customers.length,
      debtorCount: debtors.length,
      totalDebt,
    };
  }, [customers]);

  // 🔔 YAKLAŞAN TAKSİTLER: installmentPlan içindeki ödenmemiş + vadesi gelmiş
  // veya 3 gün içinde gelecek olanlar. SADECE son 1 ay içinde kaydedilen müşteriler
  // için (eski müşteriler "uzun süre iletişim yok" listesinde zaten görünüyor).
  const upcomingInstallments = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Müşteri başına grupla — bir müşterinin birden çok geciken taksiti varsa
    // tek satırda toplanır, kullanıcı dokunarak detayları görür.
    const groups = new Map();
    for (const c of customers) {
      const created = toDate(c.createdAt);
      if (!created || created < oneMonthAgo) continue;

      const plan = Array.isArray(c.installmentPlan) ? c.installmentPlan : [];
      if (plan.length === 0) continue;
      const dismissedIds = new Set(
        Array.isArray(c.dismissedInstallmentIds) ? c.dismissedInstallmentIds : []
      );

      const overdueList = [];
      for (let i = 0; i < plan.length; i++) {
        const inst = plan[i];
        if (dismissedIds.has(inst.id)) continue;
        const status = getInstallmentStatus(inst, 3);
        if (status === 'overdue' || status === 'upcoming') {
          overdueList.push({
            installment: inst,
            installmentNo: i + 1,
            status,
            dueDate: inst.vadesi?.toDate?.() || inst.vadesi,
          });
        }
      }
      if (overdueList.length === 0) continue;

      // En eski vadeli üstte
      overdueList.sort((a, b) =>
        (a.dueDate?.getTime?.() || 0) - (b.dueDate?.getTime?.() || 0)
      );
      const oldest = overdueList[0];
      const totalDue = overdueList.reduce(
        (s, x) => s + (x.installment.tutar || 0),
        0
      );

      groups.set(c.id, {
        key: c.id,
        customer: c,
        installments: overdueList,
        totalPlanCount: plan.length,
        totalDueAmount: totalDue,
        oldestDueDate: oldest.dueDate,
      });
    }
    // Müşterileri en eski vadeli olana göre sırala
    return Array.from(groups.values()).sort((a, b) =>
      (a.oldestDueDate?.getTime?.() || 0) - (b.oldestDueDate?.getTime?.() || 0)
    );
  }, [customers]);

  // Hatırlatma: HER müşteri (borçlu + borçsuz) — threshold gün boyunca aktivite yoksa
  // listede çıkar. Eski müşteriyle tekrar iletişim için.
  const needAttention = useMemo(() => {
    return customers
      .map((c) => {
        // lastPaymentAt boşsa paymentHistory'den en güncel ödemeyi türet
        let lastPay = toDate(c.lastPaymentAt);
        if (!lastPay && Array.isArray(c.paymentHistory) && c.paymentHistory.length > 0) {
          let maxDate = null;
          for (const p of c.paymentHistory) {
            const d = toDate(p.at);
            if (d && (!maxDate || d > maxDate)) maxDate = d;
          }
          lastPay = maxDate;
        }
        const order = toDate(c.orderDate) || toDate(c.createdAt);
        const refDate = lastPay || order;
        const days = daysAgo(refDate);
        return { ...c, _daysSince: days, _hasPayment: !!lastPay };
      })
      .filter((c) => !c.attentionDismissed && c._daysSince !== null && c._daysSince >= threshold)
      .sort((a, b) => b._daysSince - a._daysSince)
      .slice(0, 20);
  }, [customers, threshold]);

  const openCustomer = (c) => {
    setActiveCustomer(c);
    setActiveModule(MODULE_CUSTOMERS);
  };

  return (
    <View style={styles.flex}>
      <ModuleHeader eyebrow="HOŞGELDİN" title="Ana Sayfa" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsRow, isPhone && styles.statsRowPhone]}>
          <StatCard label="Toplam Müşteri" value={loading ? '…' : String(stats.count)} accent={colors.primary} isPhone={isPhone} />
          <StatCard label="Borçlu" value={loading ? '…' : String(stats.debtorCount)} accent={colors.danger} isPhone={isPhone} />
          <StatCard label="Toplam Alacak" value={loading ? '…' : formatTL(stats.totalDebt)} accent={colors.gold} isPhone={isPhone} />
        </View>

        {/* 🔔 Yaklaşan Taksitler */}
        <View style={styles.attentionHeader}>
          <Text style={styles.sectionTitle}>🔔 YAKLAŞAN TAKSİTLER</Text>
        </View>
        {upcomingInstallments.length === 0 ? (
          <View style={[styles.emptyAttention, shadows.sm, { marginBottom: spacing.xxl }]}>
            <Text style={styles.emptyTitle}>Vadesi yaklaşan taksit yok</Text>
            <Text style={styles.emptySub}>
              Tüm planlı taksitler vade öncesi — şu an için hatırlatma gerekmiyor.
            </Text>
          </View>
        ) : (
          <View style={[styles.attentionList, { marginBottom: spacing.xxl }]}>
            {upcomingInstallments.map((group) => (
              <DismissibleRow
                key={group.key}
                onDismiss={() => {
                  // Bu müşterinin tüm vadeli taksitlerini gizle
                  group.installments.forEach((it) =>
                    dismissInstallmentReminder(group.customer.id, it.installment.id)
                  );
                }}
              >
                <CustomerOverdueGroupRow
                  group={group}
                  onOpen={() => openCustomer(group.customer)}
                />
              </DismissibleRow>
            ))}
          </View>
        )}

        {/* Hatırlatma — iletişim süresi geçen müşteriler */}
        <View style={styles.attentionHeader}>
          <Text style={styles.sectionTitle}>HATIRLATMA — UZUN SÜRE İLETİŞİME GEÇİLMEYEN MÜŞTERİLER</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Süre eşiği:</Text>
          <Dropdown
            value={threshold}
            onChange={setThreshold}
            options={REMINDER_OPTIONS}
          />
        </View>

        {needAttention.length === 0 ? (
          <View style={[styles.emptyAttention, shadows.sm]}>
            <Text style={styles.emptyTitle}>Hatırlatma yok</Text>
            <Text style={styles.emptySub}>
              Son {labelForDays(threshold)} içinde iletişime geçilmemiş müşteri yok.
            </Text>
          </View>
        ) : (
          <View style={styles.attentionList}>
            {needAttention.map((c) => (
              <DismissibleRow
                key={c.id}
                onDismiss={() => dismissAttentionReminder(c.id)}
              >
                <AttentionRow customer={c} onPress={() => openCustomer(c)} />
              </DismissibleRow>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>HIZLI İŞLEM</Text>

        <View style={styles.actionsGrid}>
          <ActionCard
            title="Yeni Müşteri Ekle"
            desc="Müşteri bilgilerini ve ödeme detaylarını gir"
            accent={colors.primary}
            onPress={() => setActiveModule(MODULE_CUSTOMERS)}
          />
          <ActionCard
            title="Müşterileri Görüntüle"
            desc="Tüm müşteri listesi ve arama"
            accent={colors.info}
            onPress={() => setActiveModule(MODULE_CUSTOMERS)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, accent, isPhone }) {
  return (
    <View style={[styles.statCard, isPhone && styles.statCardPhone, shadows.sm]}>
      <LinearGradient
        colors={gradients.cardSubtle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.statAccent, { backgroundColor: accent }]} />
      {isPhone ? (
        <View style={styles.statRowPhone}>
          <Text style={styles.statLabelPhone}>{label}</Text>
          <Text style={styles.statValuePhone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {value}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </>
      )}
    </View>
  );
}

// Satırı gizlemek için sarmalayıcı.
// Mobil: sola swipe → kırmızı "Sil" paneli görünür → onDismiss
// Masaüstü: sağ üstte küçük × butonu visible → onDismiss
function DismissibleRow({ onDismiss, children }) {
  const { isDesktop } = useDeviceType();

  if (isDesktop) {
    return (
      <View style={styles.dismissibleWrap}>
        {children}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissBtnTxt}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderRightActions = () => (
    <View style={styles.swipeAction}>
      <Text style={styles.swipeActionTxt}>Sil</Text>
    </View>
  );
  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={60}
      friction={1.5}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') onDismiss();
      }}
    >
      {children}
    </Swipeable>
  );
}

function CustomerOverdueGroupRow({ group, onOpen }) {
  const { customer, installments, totalPlanCount, totalDueAmount } = group;
  const [expanded, setExpanded] = useState(false);

  // En eski taksiti referans al — kart başlığı + WhatsApp mesajı için
  const oldest = installments[0];
  const oldestStatus = oldest.status;
  const isOverdue = oldestStatus === 'overdue';
  const accentColor = isOverdue ? colors.danger : colors.warning;

  // Gün hesabı
  const todayMs = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  })();
  const dueMs = (() => {
    const d = new Date(oldest.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const diffDays = Math.round((dueMs - todayMs) / 86400000);
  const daysOverdue = diffDays < 0 ? Math.abs(diffDays) : 0;

  let dueLabel;
  if (diffDays === 0) dueLabel = 'BUGÜN vadesi';
  else if (diffDays === 1) dueLabel = 'YARIN vadesi';
  else if (diffDays < 0) dueLabel = `${daysOverdue} gün gecikme`;
  else dueLabel = `${diffDays} gün kaldı`;

  const countLabel =
    installments.length === 1
      ? '1 taksit bekliyor'
      : `${installments.length} taksit bekliyor`;

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
    const result = await sendWhatsAppReminder({
      customerName: customer.fullName,
      phone: customer.phone,
      amount: oldest.installment.tutar,
      dueDate: oldest.dueDate,
      installmentNo: oldest.installmentNo,
      totalInstallments: totalPlanCount,
      remainingDebt: customer.remainingAmount,
      daysOverdue, // 30+ → "uzun gecikme" varyantı
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

  return (
    <View style={[styles.upcomingRow, shadows.sm, { borderLeftColor: accentColor }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded((e) => !e)}
        style={styles.upcomingTop}
      >
        <View style={[styles.upcomingDot, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.upcomingName}>{customer.fullName || '—'}</Text>
          <Text style={[styles.upcomingMeta, { color: accentColor }]}>
            {countLabel} · {dueLabel}
          </Text>
        </View>
        <View style={styles.upcomingAmountWrap}>
          <Text style={styles.upcomingAmountVal}>
            {(totalDueAmount || 0).toLocaleString('tr-TR')} ₺
          </Text>
          <Text style={styles.upcomingExpandHint}>{expanded ? 'gizle ▾' : 'detay ▸'}</Text>
        </View>
      </TouchableOpacity>

      {/* Genişletilmiş taksit listesi */}
      {expanded && (
        <View style={styles.expandedList}>
          {installments.map((it, idx) => {
            const d = new Date(it.dueDate);
            d.setHours(0, 0, 0, 0);
            const diff = Math.round((d.getTime() - todayMs) / 86400000);
            const lbl =
              diff < 0 ? `${Math.abs(diff)} gün gecikme` :
              diff === 0 ? 'Bugün' :
              `${diff} gün kaldı`;
            return (
              <View key={it.installment.id} style={styles.expandedItem}>
                <Text style={styles.expandedItemNo}>{it.installmentNo}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expandedItemDate}>
                    {new Date(it.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>
                  <Text style={[styles.expandedItemStatus, { color: it.status === 'overdue' ? colors.danger : colors.warning }]}>
                    {lbl}
                  </Text>
                </View>
                <Text style={styles.expandedItemAmount}>
                  {(it.installment.tutar || 0).toLocaleString('tr-TR')} ₺
                </Text>
              </View>
            );
          })}
          <TouchableOpacity activeOpacity={0.7} onPress={onOpen} style={styles.openCustomerBtn}>
            <Text style={styles.openCustomerTxt}>Müşteri kartını aç ›</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={handleWhatsApp}>
        <LinearGradient
          colors={['#25D366', '#1EB055']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.waBtn}
        >
          <Text style={styles.waBtnTxt}>WHATSAPP İLE HATIRLAT</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function AttentionRow({ customer, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.attentionRow, shadows.sm]}
    >
      <View style={styles.attentionDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.attentionName}>{customer.fullName || '—'}</Text>
        <Text style={styles.attentionMeta}>
          {customer._hasPayment
            ? `Son ödeme ${customer._daysSince} gün önce`
            : `Sipariş üzerinden ${customer._daysSince} gün geçti, ödeme yok`}
          {customer.phone ? ` · ${customer.phone}` : ''}
        </Text>
      </View>
      <View style={styles.attentionAmount}>
        <Text style={styles.attentionAmountLabel}>Kalan</Text>
        <Text style={styles.attentionAmountVal}>{formatTL(customer.remainingAmount)}</Text>
      </View>
      <Text style={styles.attentionChev}>›</Text>
    </TouchableOpacity>
  );
}

function ActionCard({ title, desc, accent, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.actionCard, shadows.sm]}>
      <LinearGradient
        colors={gradients.cardSubtle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.actionAccent, { backgroundColor: accent || colors.primary }]} />
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{desc}</Text>
      <View style={styles.actionBtn}>
        <Text style={styles.actionBtnTxt}>Aç ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  // Telefonda dikey istif — taşma olmaz, her satır tam genişlik
  statsRowPhone: { flexDirection: 'column', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  statCardPhone: {
    flex: 0,
    minHeight: 68,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 1.2, marginTop: 4 },
  // Telefon: tek satırda solda label, sağda büyük değer
  statRowPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statLabelPhone: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1.2,
    flex: 1,
  },
  statValuePhone: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.md },

  attentionHeader: {
    marginBottom: spacing.sm,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  sliderLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },

  emptyAttention: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  emptyTitle: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },

  attentionList: { gap: 8 },

  // Yaklaşan Taksitler satırı
  upcomingRow: {
    backgroundColor: colors.bgCard,
    borderLeftWidth: 4,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  upcomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  upcomingName: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  upcomingMeta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  upcomingAmountWrap: { alignItems: 'flex-end', paddingTop: 28 },
  upcomingAmountLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  upcomingAmountVal: { fontSize: 16, fontWeight: '900', color: colors.gold },
  upcomingExpandHint: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginTop: 3 },

  // Genişletilmiş taksit listesi (detay)
  expandedList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  expandedItemNo: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 12,
    width: 20,
  },
  expandedItemDate: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  expandedItemStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  expandedItemAmount: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  openCustomerBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  openCustomerTxt: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  waBtn: {
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  waBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.6,
  },

  // Mobil swipe paneli — emojisiz, sade kırmızı "SİL"
  swipeAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: radii.md,
    marginLeft: 6,
  },
  swipeActionTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 3,
  },

  // Masaüstü × dismiss butonu — sağ üst köşede, sade, içeriğe binmez
  dismissibleWrap: {
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(226, 92, 92, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 92, 92, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dismissBtnTxt: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },

  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 12,
  },
  attentionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  attentionName: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  attentionMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  attentionAmount: { alignItems: 'flex-end' },
  attentionAmountLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  attentionAmountVal: { fontSize: 14, fontWeight: '800', color: colors.danger, marginTop: 2 },
  attentionChev: { fontSize: 22, color: colors.textMuted },

  actionsGrid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  actionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionAccent: { height: 4, width: 40, borderRadius: 2, marginBottom: 12 },
  actionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  actionDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actionBtn: { marginTop: 12 },
  actionBtnTxt: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
