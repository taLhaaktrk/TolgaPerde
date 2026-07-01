import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ModuleHeader from '../components/shell/ModuleHeader';
import NewCustomerModal from '../components/customers/NewCustomerModal';
import useCustomers from '../hooks/useCustomers';
import useDeviceType from '../hooks/useDeviceType';
import { formatPhoneTR } from '../utils/format';
import { useAppShell } from '../context/AppShellContext';
import { colors, gradients, spacing, radii, shadows } from '../theme/colors';

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const sourceLabel = (s) => {
  if (s === 'canvas') return 'Çizim';
  if (s === 'photo_archive') return 'Foto';
  return 'Manuel';
};

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toLocaleUpperCase('tr');
};

const normalize = (s) => (s || '').toLocaleLowerCase('tr');

// "Aktif müşteri" tanımı: sipariş tarihinden son 10 gün içinde — ActiveCustomerCard ile aynı
const ACTIVE_CUSTOMER_DAYS = 10;
const isActiveCustomer = (c) => {
  const order = c.orderDate?.toDate?.() || (c.orderDate instanceof Date ? c.orderDate : null);
  if (!order) return false;
  const days = Math.floor((Date.now() - order.getTime()) / 86400000);
  return days >= 0 && days <= ACTIVE_CUSTOMER_DAYS;
};

export default function CustomersModule() {
  const { customers, loading } = useCustomers(500);
  const { activeCustomer, setActiveCustomer } = useAppShell();
  const { isPhone } = useDeviceType();
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'new' | 'archive' | null
  const [activeOnly, setActiveOnly] = useState(false);

  const activeCount = useMemo(() => customers.filter(isActiveCustomer).length, [customers]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    let base = customers;
    if (activeOnly) base = base.filter(isActiveCustomer);
    if (q) base = base.filter((c) => normalize(c.fullName).includes(q));
    // Tüm modlarda Türkçe alfabetik sıralama
    return [...base].sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '', 'tr', { sensitivity: 'base' })
    );
  }, [customers, query, activeOnly]);

  const actionButtons = (
    <View style={[styles.actionsRow, isPhone && styles.actionsRowPhone]}>
      <Text style={styles.countBadge}>{loading ? '…' : `${filtered.length} kayıt`}</Text>

      {/* Aktif müşteri filtresi — toggle */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setActiveOnly((v) => !v)}
      >
        <View style={[styles.activeBtn, activeOnly && styles.activeBtnOn]}>
          <View style={[styles.activeDot, activeOnly && styles.activeDotOn]} />
          <Text style={[styles.activeBtnTxt, activeOnly && styles.activeBtnTxtOn]}>
            Aktif Müşteri
          </Text>
          {activeCount > 0 && (
            <View style={styles.activeCountBadge}>
              <Text style={styles.activeCountTxt}>{activeCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalMode('archive')}
      >
        <View style={styles.archiveBtn}>
          <Text style={styles.archiveBtnTxt}>+ Eski Müşteri</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalMode('new')}
      >
        <LinearGradient
          colors={gradients.goldButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnTxt}>+ Yeni Müşteri</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.flex}>
      <ModuleHeader
        eyebrow="MÜŞTERİ YÖNETİMİ"
        title="Müşteriler"
        right={!isPhone ? actionButtons : null}
      />

      {/* Telefonda butonlar başlık altında ayrı satırda — flex-wrap ile 2 satıra düşer */}
      {isPhone && <View style={styles.phoneActionsBar}>{actionButtons}</View>}

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Müşteri adı ara…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Eşleşme yok</Text>
              <Text style={styles.emptySub}>
                {query ? 'Farklı bir isim deneyin.' : 'Henüz müşteri kaydı yok.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CustomerRow
              customer={item}
              active={activeCustomer?.id === item.id}
              onPress={() => setActiveCustomer(item)}
            />
          )}
        />
      )}

      <NewCustomerModal
        visible={modalMode !== null}
        mode={modalMode || 'new'}
        onClose={() => setModalMode(null)}
        onSaved={() => { /* useCustomers stream zaten yeni kayıt için tetikleniyor */ }}
      />
    </View>
  );
}

function CustomerRow({ customer, active, onPress }) {
  // Meta satırı: telefon · sipariş tarihi · (varsa) not
  const phoneStr = customer.phone ? formatPhoneTR(customer.phone) : 'tel yok';
  const orderDate =
    customer.orderDate?.toDate?.() ||
    (customer.orderDate instanceof Date ? customer.orderDate : null);
  const dateStr = orderDate
    ? orderDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;
  const noteStr = customer.notes ? customer.notes.trim() : null;
  const metaParts = [phoneStr];
  if (dateStr) metaParts.push(dateStr);
  if (noteStr) metaParts.push(noteStr);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.row, active && styles.rowActive, shadows.sm]}>
      <LinearGradient
        colors={active ? gradients.activeRail : gradients.cardSubtle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.avatar, active && { borderColor: colors.gold }]}>
        <Text style={styles.avatarTxt}>{initials(customer.fullName)}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name} numberOfLines={1}>{customer.fullName || '—'}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join(' · ')}
        </Text>
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.amountLabel}>Kalan</Text>
        <Text style={styles.amountVal}>{formatTL(customer.remainingAmount)}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Geniş ekran: yatay sıra, header'ın sağında
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Telefon: flex-wrap ile gerekirse 2 satıra düşer, hepsi görünür
  actionsRowPhone: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  // Telefonda header altındaki action satırı
  phoneActionsBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  countBadge: {
    color: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  addBtnTxt: {
    color: colors.primaryDeep,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  archiveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  archiveBtnTxt: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Aktif Müşteri toggle butonu
  activeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: 'transparent',
  },
  activeBtnOn: {
    backgroundColor: colors.success,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeDotOn: {
    backgroundColor: '#FFFFFF',
  },
  activeBtnTxt: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  activeBtnTxtOn: {
    color: '#FFFFFF',
  },
  activeCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountTxt: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  searchWrap: { padding: spacing.lg, paddingBottom: 0 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  searchClear: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 6 },

  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  rowActive: { borderColor: colors.gold },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  avatarTxt: { color: colors.textPrimary, fontWeight: '800', fontSize: 13 },
  name: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  amountCol: { alignItems: 'flex-end', marginRight: 8 },
  amountLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  amountVal: { fontSize: 14, fontWeight: '800', color: colors.danger, marginTop: 2 },
  chev: { fontSize: 22, color: colors.textMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, color: colors.textPrimary, fontWeight: '700' },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
