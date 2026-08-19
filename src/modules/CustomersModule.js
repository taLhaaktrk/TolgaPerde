import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NewCustomerModal from '../components/customers/NewCustomerModal';
import useCustomers from '../hooks/useCustomers';
import { formatPhoneTR } from '../utils/format';
import { useAppShell } from '../context/AppShellContext';
import { colors, gradients } from '../theme/colors';

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

const normalize = (s) => (s || '').toLocaleLowerCase('tr');

// "Aktif müşteri" tanımı: sipariş tarihinden son 10 gün içinde
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
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'new' | null
  const [activeOnly, setActiveOnly] = useState(false);

  const activeCount = useMemo(() => customers.filter(isActiveCustomer).length, [customers]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    let base = customers;
    if (activeOnly) base = base.filter(isActiveCustomer);
    if (q) base = base.filter((c) => normalize(c.fullName).includes(q));
    return [...base].sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '', 'tr', { sensitivity: 'base' })
    );
  }, [customers, query, activeOnly]);

  // Alfabetik gruplama — SectionList için
  const sections = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const first = (c.fullName || '').trim().charAt(0);
      const letter = first ? first.toLocaleUpperCase('tr') : '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([title, data]) => ({ title, data }));
  }, [filtered]);

  return (
    <View style={styles.flex}>
      {/* Üst başlık paneli — hafif bordo tint + altın hairline (Ana Sayfa ile tutarlı) */}
      <View style={[styles.heroBlock, { paddingTop: (insets.top || 12) + 14 }]}>
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>Müşteriler</Text>
          <TouchableOpacity activeOpacity={0.6} onPress={() => setActiveOnly((v) => !v)}>
            <View style={[styles.headChip, activeOnly && styles.headChipOn]}>
              <Text style={[styles.headChipTxt, activeOnly && styles.headChipTxtOn]}>
                {activeOnly ? `Aktif ${activeCount}` : `${filtered.length} kayıt`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Arama — panel içinde, sade underline */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>○</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Ara…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.groupLetter}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <CustomerRow
              customer={item}
              active={activeCustomer?.id === item.id}
              onPress={() => setActiveCustomer(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Eşleşme yok</Text>
              <Text style={styles.emptySub}>
                {query ? 'Farklı bir isim deneyin.' : 'Henüz müşteri kaydı yok.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Alt sabit — Müşteri Ekle */}
      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setModalMode('new')}>
          <LinearGradient
            colors={gradients.goldButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnTxt}>+ Müşteri Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <NewCustomerModal
        visible={modalMode !== null}
        onClose={() => setModalMode(null)}
        onSaved={() => { /* useCustomers stream zaten tetikleniyor */ }}
      />
    </View>
  );
}

function CustomerRow({ customer, active, onPress }) {
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

  const isActive = isActiveCustomer(customer);
  const hasDebt = (customer.remainingAmount || 0) > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[styles.row, active && styles.rowActive]}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <View style={styles.nameRow}>
          {isActive && <View style={styles.activeDot} />}
          <Text style={styles.name} numberOfLines={1}>{customer.fullName || '—'}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{metaParts.join(' · ')}</Text>
      </View>
      {hasDebt ? (
        <Text style={styles.amountDebt} numberOfLines={1}>
          {formatTL(customer.remainingAmount)}
        </Text>
      ) : (
        <Text style={styles.amountDone}>Tamam</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  // Üst başlık paneli — Ana Sayfa hero ile aynı ruh
  heroBlock: {
    paddingHorizontal: 22,
    paddingBottom: 4,
    backgroundColor: 'rgba(92, 13, 20, 0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },

  // Sayfa başlığı
  pageHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  pageTitle: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.40)',
    backgroundColor: 'rgba(201, 169, 97, 0.12)',
    marginBottom: 5,
  },
  headChipOn: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 169, 97, 0.28)',
  },
  headChipTxt: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headChipTxtOn: {
    color: colors.goldLight,
  },

  // Search — panel içinde sade satır (alt hairline paneldeki altın çizgi zaten var)
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  searchIcon: { color: colors.gold, fontSize: 16, fontWeight: '700' },
  searchInput: {
    flex: 1,
    fontSize: 16, // iOS Safari 16px altı → auto-zoom
    color: colors.textPrimary,
    padding: 0,
  },
  searchClear: { color: colors.gold, fontSize: 14, fontWeight: '700' },

  // Liste
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 110, // alt sabit bar için boşluk
  },
  groupLetter: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 6,
  },

  // Defter satırı
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowActive: {
    backgroundColor: 'rgba(201, 169, 97, 0.08)',
    borderLeftColor: colors.gold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  amountDebt: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  amountDone: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Alt sabit bar
  bottomBar: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.bg,
  },
  addBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnTxt: {
    color: colors.primaryDeep,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, color: colors.textPrimary, fontWeight: '700' },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
