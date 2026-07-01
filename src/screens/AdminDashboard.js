import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import useCustomers from '../hooks/useCustomers';
import PhotoArchivePanel from '../components/PhotoArchivePanel';
import { colors, gradients, radii, spacing, shadows } from '../theme/colors';

const TAB_CUSTOMERS = 'customers';
const TAB_OCR = 'ocr';

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const toDateStr = (ts) => {
  const d = ts?.toDate?.() || (ts instanceof Date ? ts : null);
  return d ? d.toLocaleString('tr-TR') : '—';
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(TAB_CUSTOMERS);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Üst bar */}
      <LinearGradient
        colors={gradients.moduleHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topbar}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.topEyebrow}>ADMIN TEST LABORATUVARI</Text>
          <Text style={styles.topTitle}>Geliştirici Paneli</Text>
        </View>
        <View style={styles.userChip}>
          <Text style={styles.userChipTxt}>{user?.displayName || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutTxt}>Çıkış Yap</Text>
        </TouchableOpacity>
        <View style={styles.goldLine} />
      </LinearGradient>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TabBtn label="Müşteri Kayıtları" active={tab === TAB_CUSTOMERS} onPress={() => setTab(TAB_CUSTOMERS)} />
        <TabBtn label="OCR Test (El Yazısı Okuma)" active={tab === TAB_OCR} onPress={() => setTab(TAB_OCR)} />
      </View>

      <View style={styles.content}>
        {tab === TAB_CUSTOMERS ? <CustomersDebugList /> : <OcrTestArea />}
      </View>
    </SafeAreaView>
  );
}

function TabBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabBtnTxt, active && styles.tabBtnTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CustomersDebugList() {
  const { customers, loading } = useCustomers(500);

  const summary = useMemo(() => {
    const withMedia = customers.filter((c) => c.mediaUrl).length;
    const withPhotos = customers.filter((c) => (c.measurementPhotos || []).length > 0).length;
    return { total: customers.length, withMedia, withPhotos };
  }, [customers]);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.summaryRow}>
        <SummaryChip label="Toplam Kayıt" value={String(summary.total)} />
        <SummaryChip label="Çizimli" value={String(summary.withMedia)} />
        <SummaryChip label="Foto'lu" value={String(summary.withPhotos)} />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyTxt}>Henüz müşteri kaydı yok.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.recordCard, shadows.sm]}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordName}>{item.fullName || '—'}</Text>
              <Text style={styles.recordSource}>{item.source || 'manual'}</Text>
            </View>
            <Text style={styles.recordId}>id: {item.id}</Text>

            <View style={styles.recordGrid}>
              <Field label="Telefon" value={item.phone || '—'} />
              <Field label="Toplam" value={formatTL(item.totalAmount)} />
              <Field label="Peşinat" value={formatTL(item.deposit)} />
              <Field label="Kalan" value={formatTL(item.remainingAmount)} danger />
            </View>

            <View style={styles.recordGrid}>
              <Field label="Sipariş" value={toDateStr(item.orderDate)} />
              <Field label="Oluşturma" value={toDateStr(item.createdAt)} />
              <Field label="Son Ödeme" value={toDateStr(item.lastPaymentAt)} />
              <Field label="Taksit" value={String((item.paymentHistory || []).length)} />
            </View>

            <View style={styles.recordFlags}>
              <Flag on={!!item.mediaUrl} label="Çizim" />
              <Flag on={(item.measurementPhotos || []).length > 0} label={`Foto (${(item.measurementPhotos || []).length})`} />
              <Flag on={!!item.notes} label="Not" />
            </View>

            {!!item.notes && <Text style={styles.recordNotes}>Not: {item.notes}</Text>}
          </View>
        )}
      />
    </View>
  );
}

function OcrTestArea() {
  return (
    <View style={styles.ocrWrap}>
      <Text style={styles.ocrHint}>
        Galeri ya da kameradan bir defter görseli seç, "İsim Oku" ile OCR doğruluğunu test et.
        ("Arşive Yükle" gerçek kayıt oluşturur — test için "İsim Oku" yeterli.)
      </Text>
      <View style={styles.ocrPanel}>
        <PhotoArchivePanel />
      </View>
    </View>
  );
}

function SummaryChip({ label, value }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, value, danger }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, danger && { color: colors.danger }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Flag({ on, label }) {
  return (
    <View style={[styles.flag, on ? styles.flagOn : styles.flagOff]}>
      <Text style={[styles.flagTxt, on ? styles.flagTxtOn : styles.flagTxtOff]}>
        {on ? '✓ ' : '— '}{label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  topEyebrow: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  topTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 2 },
  userChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  userChipTxt: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  logoutBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  logoutTxt: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  goldLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.gold, opacity: 0.5 },

  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgPanel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tabBtnActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  tabBtnTxt: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabBtnTxtActive: { color: colors.gold, fontWeight: '800' },

  content: { flex: 1 },

  summaryRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  summaryChip: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  summaryValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  emptyTxt: { color: colors.textMuted, textAlign: 'center', padding: spacing.xxl },

  recordCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  recordSource: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  recordId: { color: colors.textFaint, fontSize: 10, marginTop: 2, fontFamily: 'Courier' },

  recordGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  field: { flex: 1 },
  fieldLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  fieldValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', marginTop: 1 },

  recordFlags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, borderWidth: 1 },
  flagOn: { backgroundColor: colors.successSoft, borderColor: 'rgba(91,168,90,0.4)' },
  flagOff: { backgroundColor: colors.bgInput, borderColor: colors.borderStrong },
  flagTxt: { fontSize: 11, fontWeight: '700' },
  flagTxtOn: { color: colors.success },
  flagTxtOff: { color: colors.textFaint },

  recordNotes: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm, fontStyle: 'italic' },

  ocrWrap: { flex: 1, padding: spacing.lg },
  ocrHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ocrPanel: { flex: 1 },
});
