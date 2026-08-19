import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '../components/ui/Dropdown';
import Alert from '../utils/alert';
import useCustomers from '../hooks/useCustomers';
import useDeviceType from '../hooks/useDeviceType';
import { useAppShell, MODULE_CUSTOMERS } from '../context/AppShellContext';
import { getInstallmentStatus } from '../utils/installments';
import { sendWhatsAppReminder, sendStaleReminder } from '../utils/whatsapp';
import {
  dismissInstallmentReminder,
  dismissAttentionReminder,
} from '../services/customerService';
import { colors } from '../theme/colors';

const TR_MONTHS = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const TR_DAYS   = ['PAZAR','PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ'];

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const formatShort = (n) => {
  const v = n || 0;
  if (v >= 1_000_000) {
    const mn = v / 1_000_000;
    return (mn >= 10 ? mn.toFixed(0) : mn.toFixed(1)) + ' Mn ₺';
  }
  if (v >= 1_000) return Math.round(v / 1_000) + ' B ₺';
  return v.toLocaleString('tr-TR') + ' ₺';
};

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

const daysAgo = (date) =>
  date ? Math.floor((Date.now() - date.getTime()) / 86400000) : null;

const todayHeader = () => {
  const d = new Date();
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${TR_DAYS[d.getDay()]}`;
};

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
};

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

const TABS = [
  { key: 'today',   label: 'Bugün' },
  { key: 'overdue', label: 'Gecikmiş' },
  { key: 'week',    label: 'Bu hafta' },
];

export default function HomeModule() {
  const { customers, loading } = useCustomers(500);
  const { setActiveModule, setActiveCustomer } = useAppShell();
  const insets = useSafeAreaInsets();
  const [threshold, setThreshold] = useState(30);
  const [tab, setTab] = useState('today');

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => (c.remainingAmount || 0) > 0);
    const totalDebt = debtors.reduce((s, c) => s + (c.remainingAmount || 0), 0);
    let paid = 0;
    for (const c of customers) {
      if (Array.isArray(c.paymentHistory)) {
        for (const p of c.paymentHistory) paid += (p.amount || 0);
      }
    }
    const totalSales = paid + totalDebt;
    const pct = totalSales > 0 ? Math.round((paid / totalSales) * 100) : 0;
    return { count: customers.length, debtorCount: debtors.length, totalDebt, paid, totalSales, pct };
  }, [customers]);

  // 🔔 YAKLAŞAN TAKSİTLER — son 1 ay içinde kaydedilen müşteriler için
  const upcomingInstallments = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

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

      overdueList.sort((a, b) =>
        (a.dueDate?.getTime?.() || 0) - (b.dueDate?.getTime?.() || 0)
      );
      const oldest = overdueList[0];
      const totalDue = overdueList.reduce(
        (s, x) => s + (x.installment.tutar || 0), 0
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
    return Array.from(groups.values()).sort((a, b) =>
      (a.oldestDueDate?.getTime?.() || 0) - (b.oldestDueDate?.getTime?.() || 0)
    );
  }, [customers]);

  const todayMs = startOfToday();
  const weekMs = todayMs + 7 * 86400000;

  // Sekmeye göre filtre
  const filteredUpcoming = useMemo(() => {
    return upcomingInstallments.filter((g) => {
      const d = new Date(g.oldestDueDate);
      d.setHours(0, 0, 0, 0);
      const ms = d.getTime();
      if (tab === 'today')   return ms === todayMs;
      if (tab === 'overdue') return ms < todayMs;
      if (tab === 'week')    return ms >= todayMs && ms <= weekMs;
      return true;
    });
  }, [upcomingInstallments, tab, todayMs, weekMs]);

  const overdueCount = useMemo(() =>
    upcomingInstallments.filter((g) => {
      const d = new Date(g.oldestDueDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < todayMs;
    }).length,
  [upcomingInstallments, todayMs]);

  // Hatırlatma — uzun süre iletişim yok
  const needAttention = useMemo(() => {
    return customers
      .map((c) => {
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

  const filledPct = Math.min(100, Math.max(0, stats.pct));

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: (insets.top || 12) + 16 }]}
      >
        {/* Üst başlık paneli — hafif bordo tint + altın hairline */}
        <View style={styles.heroBlock}>
          <Text style={styles.dateHeader}>{todayHeader()}</Text>
          <Text
            style={styles.bigTotal}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {loading ? '…' : formatTL(stats.totalDebt)}
          </Text>
          <Text style={styles.bigSub}>
            toplam alacak · {stats.debtorCount} borçlu müşteri
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${filledPct}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLeft}>
              <Text style={{ color: colors.success, fontWeight: '700' }}>%{stats.pct} tahsil</Text>
              {'  ·  '}{formatShort(stats.paid)}
            </Text>
            <Text style={styles.progressRight}>{formatShort(stats.totalDebt)} bekliyor</Text>
          </View>
        </View>

        {/* Bölüm başlığı — Taksitler */}
        <SectionHeader title="YAKLAŞAN TAKSİTLER" />

        {/* Sekmeler */}
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const label = t.key === 'overdue' && overdueCount > 0
              ? `Gecikmiş ${overdueCount}`
              : t.label;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                activeOpacity={0.6}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Yaklaşan taksitler listesi */}
        {filteredUpcoming.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyTitle}>
              {tab === 'today'   ? 'Bugün vadesi yok'
              : tab === 'overdue' ? 'Geciken taksit yok'
              : /* week */         'Bu hafta vadesi yok'}
            </Text>
          </View>
        ) : (
          <View>
            {filteredUpcoming.map((group) => (
              <DismissibleRow
                key={group.key}
                onDismiss={() => {
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

        {/* Hatırlatma — uzun süre iletişim yok */}
        <View style={styles.sectionSpacer} />
        <SectionHeader title="HATIRLATMA" subtitle="uzun süre iletişim yok" count={needAttention.length} />
        <View style={styles.dropRow}>
          <Text style={styles.dropLabel}>Süre eşiği:</Text>
          <Dropdown value={threshold} onChange={setThreshold} options={REMINDER_OPTIONS} />
        </View>

        {needAttention.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyTitle}>Hatırlatma yok</Text>
            <Text style={styles.emptySub}>
              Son {labelForDays(threshold)} içinde iletişimsiz müşteri yok.
            </Text>
          </View>
        ) : (
          <View>
            {needAttention.map((c) => (
              <DismissibleRow key={c.id} onDismiss={() => dismissAttentionReminder(c.id)}>
                <AttentionRow customer={c} onPress={() => openCustomer(c)} />
              </DismissibleRow>
            ))}
          </View>
        )}

        {/* Hızlı işlem */}
        <View style={styles.sectionSpacer} />
        <SectionHeader title="HIZLI İŞLEM" />
        <View>
          <ActionRow
            label="Yeni Müşteri Ekle"
            desc="Müşteri bilgilerini ve ödeme planını gir"
            onPress={() => setActiveModule(MODULE_CUSTOMERS)}
          />
          <ActionRow
            label="Müşterileri Görüntüle"
            desc="Tüm müşteri listesi ve arama"
            onPress={() => setActiveModule(MODULE_CUSTOMERS)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Sola swipe (mobil) veya × (masaüstü) ile satırı gizle
function DismissibleRow({ onDismiss, children }) {
  const { isDesktop } = useDeviceType();

  if (isDesktop) {
    return (
      <View style={styles.dismissibleWrap}>
        {children}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
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

  const oldest = installments[0];
  const isOverdue = oldest.status === 'overdue';
  const amountColor = isOverdue ? colors.danger : colors.warning;

  const todayMs = startOfToday();
  const dueMs = (() => {
    const d = new Date(oldest.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const diffDays = Math.round((dueMs - todayMs) / 86400000);
  const daysOverdue = diffDays < 0 ? Math.abs(diffDays) : 0;

  const dateStr = new Date(oldest.dueDate).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
  const gecikmeStr =
    diffDays < 0 ? `${daysOverdue} gün gecikme`
    : diffDays === 0 ? 'BUGÜN vadesi'
    : `${diffDays} gün kaldı`;
  const metaStr = installments.length > 1
    ? `${dateStr} · ${gecikmeStr} · ${installments.length} taksit`
    : `${dateStr} · ${gecikmeStr}`;

  const isSplitCust = !!customer.isSplit && customer.sides;
  const brideItems = isSplitCust ? installments.filter((it) => it.installment.side === 'bride') : [];
  const groomItems = isSplitCust ? installments.filter((it) => it.installment.side === 'groom') : [];

  const sendSideWhatsApp = async (sideKey) => {
    const sideData = customer.sides?.[sideKey];
    const sideItems = sideKey === 'bride' ? brideItems : groomItems;
    if (!sideData || sideItems.length === 0) return;
    if (!sideData.phone) {
      Alert.alert(
        'Telefon Yok',
        `${customer.fullName} — ${sideKey === 'bride' ? 'Kız Tarafı' : 'Erkek Tarafı'} için telefon kayıtlı değil.`,
        [{ text: 'Tamam' }], { tone: 'warning' }
      );
      return;
    }
    const sideOldest = sideItems[0];
    const sideDue = new Date(sideOldest.dueDate); sideDue.setHours(0, 0, 0, 0);
    const sideDiff = Math.round((sideDue.getTime() - todayMs) / 86400000);
    const sideDaysOverdue = sideDiff < 0 ? Math.abs(sideDiff) : 0;
    const sidePlan = Array.isArray(sideData.installmentPlan) ? sideData.installmentPlan : [];
    const sideTotalPlanCount = sidePlan.length;
    const sideInstallmentNo = sidePlan.findIndex((p) => p.id === sideOldest.installment.id) + 1;
    const result = await sendWhatsAppReminder({
      customerName: `${customer.fullName} (${sideKey === 'bride' ? 'Kız' : 'Erkek'})`,
      phone: sideData.phone,
      amount: sideOldest.installment.tutar,
      dueDate: sideOldest.dueDate,
      installmentNo: sideInstallmentNo || undefined,
      totalInstallments: sideTotalPlanCount || undefined,
      remainingDebt: sideData.remainingAmount,
      daysOverdue: sideDaysOverdue,
    });
    if (!result.ok) {
      Alert.alert('WhatsApp Açılamadı', result.reason || 'Bilinmeyen hata', [{ text: 'Tamam' }], { tone: 'danger' });
    }
  };

  const handleWhatsApp = async () => {
    if (!customer.phone) {
      Alert.alert(
        'Telefon Yok',
        `${customer.fullName} için kayıtlı telefon numarası bulunmuyor. Önce müşteri kartını düzenleyip telefonu ekle.`,
        [{ text: 'Tamam' }], { tone: 'warning' }
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
      daysOverdue,
    });
    if (!result.ok) {
      Alert.alert('WhatsApp Açılamadı', result.reason || 'Bilinmeyen hata', [{ text: 'Tamam' }], { tone: 'danger' });
    }
  };

  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerMain}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.6}
          style={{ flex: 1, paddingRight: 8 }}
        >
          <Text style={styles.ledgerName} numberOfLines={1}>{customer.fullName || '—'}</Text>
          <Text style={styles.ledgerMeta} numberOfLines={1}>{metaStr}</Text>
        </TouchableOpacity>
        <View style={styles.ledgerRight}>
          <Text style={[styles.ledgerAmount, { color: amountColor }]}>
            {(totalDueAmount || 0).toLocaleString('tr-TR')} ₺
          </Text>
          {isSplitCust ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
              {brideItems.length > 0 && (
                <TouchableOpacity onPress={() => sendSideWhatsApp('bride')} activeOpacity={0.6}>
                  <Text style={styles.waLink}>K · WP</Text>
                </TouchableOpacity>
              )}
              {groomItems.length > 0 && (
                <TouchableOpacity onPress={() => sendSideWhatsApp('groom')} activeOpacity={0.6}>
                  <Text style={styles.waLink}>E · WP</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={handleWhatsApp} activeOpacity={0.6} style={{ marginTop: 2 }}>
              <Text style={styles.waLink}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Detay — taksitler + kartı aç linki */}
      {expanded && (
        <View style={styles.expanded}>
          {installments.length > 1 && (
            <View style={styles.instList}>
              {installments.map((it) => {
                const d = new Date(it.dueDate); d.setHours(0, 0, 0, 0);
                const diff = Math.round((d.getTime() - todayMs) / 86400000);
                const lbl =
                  diff < 0 ? `${Math.abs(diff)} gün gecikme`
                  : diff === 0 ? 'Bugün'
                  : `${diff} gün kaldı`;
                const side = it.installment.side;
                const noLbl = side === 'bride' ? 'K'
                           : side === 'groom' ? 'E'
                           : `${it.installmentNo}.`;
                return (
                  <View key={it.installment.id} style={styles.instItem}>
                    <Text style={styles.instNo}>{noLbl}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instDate}>
                        {new Date(it.dueDate).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text style={[styles.instStatus, { color: it.status === 'overdue' ? colors.danger : colors.warning }]}>
                        {lbl}
                      </Text>
                    </View>
                    <Text style={styles.instAmount}>
                      {(it.installment.tutar || 0).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <TouchableOpacity onPress={onOpen} activeOpacity={0.6} style={{ alignSelf: 'flex-end' }}>
            <Text style={styles.openLink}>Kartı aç ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function AttentionRow({ customer, onPress }) {
  const handleWhatsApp = async () => {
    if (!customer.phone) {
      Alert.alert(
        'Telefon Yok',
        `${customer.fullName} için kayıtlı telefon numarası bulunmuyor. Önce müşteri kartını düzenleyip telefonu ekle.`,
        [{ text: 'Tamam' }], { tone: 'warning' }
      );
      return;
    }
    const result = await sendStaleReminder({
      customerName: customer.fullName,
      phone: customer.phone,
      daysSince: customer._daysSince,
      hasPayment: customer._hasPayment,
      remainingDebt: customer.remainingAmount,
    });
    if (!result.ok) {
      Alert.alert('WhatsApp Açılamadı', result.reason || 'Bilinmeyen hata', [{ text: 'Tamam' }], { tone: 'danger' });
    }
  };

  const hasDebt = (customer.remainingAmount || 0) > 0;

  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerMain}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.6}
          style={{ flex: 1, paddingRight: 8 }}
        >
          <Text style={styles.ledgerName} numberOfLines={1}>{customer.fullName || '—'}</Text>
          <Text style={styles.ledgerMeta} numberOfLines={1}>
            {customer._hasPayment
              ? `Son ödeme ${customer._daysSince} gün önce`
              : `${customer._daysSince} gündür iletişim yok`}
          </Text>
        </TouchableOpacity>
        <View style={styles.ledgerRight}>
          {hasDebt && (
            <Text style={[styles.ledgerAmount, { color: colors.danger }]}>
              {formatTL(customer.remainingAmount)}
            </Text>
          )}
          <TouchableOpacity onPress={handleWhatsApp} activeOpacity={0.6} style={{ marginTop: hasDebt ? 2 : 0 }}>
            <Text style={styles.waLink}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ActionRow({ label, desc, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.ledgerRow}>
      <View style={styles.ledgerMain}>
        <View style={styles.actionDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.actionLabel}>{label}</Text>
          {!!desc && <Text style={styles.ledgerMeta}>{desc}</Text>}
        </View>
        <Text style={styles.actionChev}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// Bölüm başlığı — sol altın ince şerit + başlık + opsiyonel count
function SectionHeader({ title, subtitle, count }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {count != null && count > 0 && (
        <View style={styles.sectionCountWrap}>
          <Text style={styles.sectionCountTxt}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // Üst blok paneli — bordo pastel tint + altın hairline (kart değil, defter içinde bir "başlık paneli")
  heroBlock: {
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 18,
    marginBottom: 24,
    backgroundColor: 'rgba(92, 13, 20, 0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },

  // Üst blok — defter başlık
  dateHeader: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  bigTotal: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  bigSub: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLeft: { fontSize: 12, color: colors.textMuted },
  progressRight: { fontSize: 12, color: colors.textMuted },

  // Sekmeler
  tabs: {
    flexDirection: 'row',
    gap: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
    marginTop: -6,
  },
  tab: {
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: colors.gold,
  },
  tabTxt: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTxtActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },

  // Defter satırı — kart yok, hairline border-bottom
  ledgerRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
  },
  ledgerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ledgerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  ledgerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  waLink: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },

  expanded: {
    marginTop: 10,
    paddingLeft: 4,
  },
  instList: { gap: 6, marginBottom: 8 },
  instItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  instNo: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 11,
    width: 24,
    textAlign: 'left',
  },
  instDate: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  instStatus: { fontSize: 11, marginTop: 1 },
  instAmount: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  openLink: { color: colors.gold, fontSize: 12, fontWeight: '700', paddingVertical: 4 },

  // Boş satır
  emptyRow: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  // Bölüm başlığı — altın ince şerit + başlık + count
  sectionSpacer: { height: 36 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.15)',
  },
  sectionBar: {
    width: 3,
    height: 18,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'lowercase',
  },
  sectionCountWrap: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: 'rgba(201, 169, 97, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountTxt: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
    marginTop: 2,
  },
  dropLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  actionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginRight: 4,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  actionChev: { color: colors.gold, fontSize: 22, marginLeft: 12, fontWeight: '600' },

  // Swipe / × dismiss — mevcut işlev korunuyor
  dismissibleWrap: { position: 'relative' },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 0,
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
  swipeAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  swipeActionTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 3,
  },
});
