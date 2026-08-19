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
import { getAvatarColor, getInitials } from '../utils/avatarColor';
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
      {/* Kayıt sayısı — sade bilgi pill */}
      <View style={styles.countPill}>
        <Text style={styles.countPillNum}>{loading ? '…' : filtered.length}</Text>
        <Text style={styles.countPillTxt}>KAYIT</Text>
      </View>

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
            <View style={[styles.activeCountBadge, activeOnly && styles.activeCountBadgeOn]}>
              <Text style={[styles.activeCountTxt, !activeOnly && { color: colors.success }]}>{activeCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* + Müşteri Ekle — birincil aksiyon */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalMode('new')}
        style={styles.addBtnWrap}
      >
        <LinearGradient
          colors={gradients.goldButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnTxt}>Müşteri Ekle</Text>
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

      {/* FAB — Yeni Müşteri hızlı ekleme (sağ alt) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalMode('new')}
        style={styles.fab}
      >
        <LinearGradient
          colors={gradients.goldButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <Text style={styles.fabPlus}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <NewCustomerModal
        visible={modalMode !== null}
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

  // Durum pill badge — Aktif / Borçlu / Tamamlandı
  const isActive = isActiveCustomer(customer);
  const hasDebt = (customer.remainingAmount || 0) > 0;
  const statusInfo = isActive
    ? { txt: 'AKTİF', color: colors.success, bg: 'rgba(56,178,110,0.15)' }
    : hasDebt
    ? { txt: 'BORÇLU', color: colors.danger, bg: 'rgba(226,92,92,0.15)' }
    : { txt: 'TAMAM', color: colors.textMuted, bg: 'rgba(255,255,255,0.06)' };

  // Renkli avatar — isimden hash
  const avColor = getAvatarColor(customer.fullName);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.row, active && styles.rowActive]}>
      <View style={[
        styles.avatar,
        { backgroundColor: active ? colors.gold : avColor.bg, borderColor: active ? colors.gold : 'transparent' },
      ]}>
        <Text style={[styles.avatarTxt, { color: active ? colors.primaryDeep : avColor.text }]}>
          {getInitials(customer.fullName)}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{customer.fullName || '—'}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusPillTxt, { color: statusInfo.color }]}>{statusInfo.txt}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join(' · ')}
        </Text>
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.amountLabel}>Kalan</Text>
        <Text style={styles.amountVal}>{formatTL(customer.remainingAmount)}</Text>
      </View>
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
  // Kayıt sayısı pill'i — sadece bilgi, en az prominent
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  countPillNum: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 13,
  },
  countPillTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // + Müşteri Ekle — birincil altın buton, gölgeli
  addBtnWrap: {
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  addBtnPlus: {
    color: colors.primaryDeep,
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 18,
  },
  addBtnTxt: {
    color: colors.primaryDeep,
    fontWeight: '900',
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
    backgroundColor: 'rgba(56,178,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountBadgeOn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16, // iOS Safari 16px altı → auto-zoom bug'ı; 16+ olmalı
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  searchClear: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 6 },

  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 18,          // chunky
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarTxt: { fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 15, flexShrink: 1 },

  // Chunky pill status (AKTİF / BORÇLU / TAMAM)
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  amountCol: { alignItems: 'flex-end', marginLeft: 8 },
  amountLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.5 },
  amountVal: { fontSize: 15, fontWeight: '900', color: colors.danger, marginTop: 3 },

  // FAB — Floating Action Button (sağ alt, yeni müşteri ekleme kısayolu)
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  fabInner: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: {
    color: colors.primaryDeep,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: -2,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, color: colors.textPrimary, fontWeight: '700' },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
