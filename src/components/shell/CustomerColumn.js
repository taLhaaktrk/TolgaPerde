import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ActiveCustomerCard from './ActiveCustomerCard';
import PaymentModal from './PaymentModal';
import NewCustomerModal from '../customers/NewCustomerModal';
import { deleteCustomer } from '../../services/customerService';
import Alert from '../../utils/alert';
import {
  useAppShell,
  MODULE_CUSTOMERS,
} from '../../context/AppShellContext';
import { colors, spacing, radii } from '../../theme/colors';

export default function CustomerColumn({ fullWidth = false }) {
  const {
    activeCustomer,
    setActiveCustomer,
    clearActiveCustomer,
    setActiveModule,
  } = useAppShell();
  const [payVisible, setPayVisible] = useState(false);
  const [paymentSide, setPaymentSide] = useState(null); // 'bride' | 'groom' | null
  const [editVisible, setEditVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePaid = ({ newRemaining, paidAmount, method, paymentEntry, side }) => {
    // Split müşteride ilgili tarafın alanlarını güncelle, ayrıca top-level toplamı yenile
    let updated;
    if (side && activeCustomer.isSplit && activeCustomer.sides) {
      const currentSide = activeCustomer.sides[side] || {};
      const updatedSide = {
        ...currentSide,
        remainingAmount: newRemaining,
        lastPaymentAt: new Date(),
        lastPaymentMethod: method,
        paymentHistory: [...(currentSide.paymentHistory || []), paymentEntry],
      };
      const otherSide = side === 'bride' ? 'groom' : 'bride';
      const otherRemaining = activeCustomer.sides[otherSide]?.remainingAmount || 0;
      updated = {
        ...activeCustomer,
        remainingAmount: newRemaining + otherRemaining,
        lastPaymentAt: new Date(),
        lastPaymentMethod: method,
        paymentHistory: [...(activeCustomer.paymentHistory || []), { ...paymentEntry, side }],
        sides: {
          ...activeCustomer.sides,
          [side]: updatedSide,
        },
      };
    } else {
      updated = {
        ...activeCustomer,
        remainingAmount: newRemaining,
        lastPaymentAt: new Date(),
        lastPaymentMethod: method,
        paymentHistory: [...(activeCustomer.paymentHistory || []), paymentEntry],
      };
    }
    setActiveCustomer(updated);
    const sideNote = side ? (side === 'bride' ? ' (Kız tarafı)' : ' (Erkek tarafı)') : '';
    Alert.alert(
      'Ödeme Alındı',
      `${paidAmount.toLocaleString('tr-TR')} ₺${sideNote} tutarındaki taksit başarıyla kaydedildi.\n\nKalan borç: ${newRemaining.toLocaleString('tr-TR')} ₺`,
      [{ text: 'Tamam' }],
      { tone: 'success' }
    );
  };

  const handleEditSaved = (result) => {
    if (result?.customerDoc) {
      // Edit result doc'undaki yeni alanları mevcut activeCustomer ile birleştir
      setActiveCustomer({ ...activeCustomer, ...result.customerDoc });
    }
  };

  const handleDelete = () => {
    if (!activeCustomer?.id) return;
    Alert.alert(
      'Müşteriyi Silmek İstiyor musunuz?',
      `${activeCustomer.fullName} adlı müşterinin tüm bilgileri, fotoğrafları ve çizimleri kalıcı olarak silinecek.\n\nBu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCustomer(activeCustomer.id);
              clearActiveCustomer();
              Alert.alert(
                'Müşteri Silindi',
                'Tüm kayıtlar başarıyla kaldırıldı.',
                [{ text: 'Tamam' }],
                { tone: 'success' }
              );
            } catch (e) {
              console.warn('Silme hatası:', e);
              Alert.alert(
                'Silme İşlemi Başarısız',
                (e.message || 'Bilinmeyen bir hata oluştu.') + '\n\nLütfen tekrar deneyin.',
                [{ text: 'Tamam' }],
                { tone: 'danger' }
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { tone: 'danger' }
    );
  };

  return (
    <View style={[styles.col, fullWidth && styles.colFull]}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Müşteri & Sipariş</Text>
        <Text style={styles.subtitle}>Yönetim Paneli</Text>
      </View>

      {/* Ortada "Tolga Tosun" italik silüet yazı */}
      <View style={styles.watermarkWrap} pointerEvents="none">
        <Text style={styles.watermarkTxt} numberOfLines={1}>Tolga Tosun</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeCustomer ? (
          <ActiveCustomerCard
            customer={activeCustomer}
            onClear={clearActiveCustomer}
            onPayment={(side) => { setPaymentSide(side || null); setPayVisible(true); }}
            onEdit={() => setEditVisible(true)}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState onGoCustomers={() => setActiveModule(MODULE_CUSTOMERS)} />
        )}
      </ScrollView>

      <PaymentModal
        visible={payVisible}
        customer={activeCustomer}
        side={paymentSide}
        onClose={() => { setPayVisible(false); setPaymentSide(null); }}
        onPaid={handlePaid}
      />

      <NewCustomerModal
        visible={editVisible}
        editingCustomer={activeCustomer}
        onClose={() => setEditVisible(false)}
        onSaved={handleEditSaved}
      />
    </View>
  );
}

function EmptyState({ onGoCustomers }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>Müşteri Seçilmedi</Text>
      <Text style={styles.emptySub}>
        Müşterilerden birini seçince bilgileri ve hesabı burada görünür.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onGoCustomers}>
        <Text style={styles.emptyBtnTxt}>Müşterilere Git ›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    width: 320,
    backgroundColor: colors.bgPanel,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    overflow: 'hidden', // watermark dışa taşmasın
  },
  colFull: {
    width: '100%',
    flex: 1,
    borderRightWidth: 0,
  },

  // "Tolga Tosun" italik silüet yazı — orta panele uygun küçük boyut
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkTxt: {
    fontSize: 36,
    fontStyle: 'italic',
    fontWeight: '300',
    color: 'rgba(201, 169, 97, 0.08)',
    letterSpacing: 2,
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  emptyEmoji: { fontSize: 48, opacity: 0.4 },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  emptyBtnTxt: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});
