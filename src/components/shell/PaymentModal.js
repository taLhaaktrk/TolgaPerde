import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Alert from '../../utils/alert';
import {
  recordPayment,
  PAYMENT_CASH,
  PAYMENT_CARD,
} from '../../services/customerService';
import { formatAmountTR, parseAmountTR } from '../../utils/format';
import { colors, gradients, radii, spacing, shadows } from '../../theme/colors';

const formatTL = (n) =>
  (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

export default function PaymentModal({ visible, customer, side, onClose, onPaid }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(PAYMENT_CASH);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setMethod(PAYMENT_CASH);
      setNote('');
    }
  }, [visible]);

  if (!customer) return null;
  // Split müşteride belirtilen tarafın kalan borcunu kullan
  const sideData = (side && customer.isSplit && customer.sides) ? customer.sides[side] : null;
  const remaining = sideData ? (sideData.remainingAmount || 0) : (customer.remainingAmount || 0);
  const sideLabelTr = side === 'bride' ? 'Kız Tarafı' : (side === 'groom' ? 'Erkek Tarafı' : null);

  const handleConfirm = async () => {
    const value = parseAmountTR(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert(
        'Geçersiz Tutar',
        'Lütfen sıfırdan büyük bir ödeme tutarı girin.',
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }
    if (value > remaining) {
      Alert.alert(
        'Tutar Çok Yüksek',
        `Girdiğiniz tutar kalan borçtan fazla.\n\nKalan borç: ${formatTL(remaining)}`,
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }
    setBusy(true);
    try {
      const result = await recordPayment(customer.id, value, method, note.trim(), side);
      onPaid?.({ ...result, side });
      onClose?.();
    } catch (e) {
      console.warn('Ödeme hatası:', e);
      Alert.alert(
        'Ödeme Kaydedilemedi',
        (e.message || 'Bilinmeyen bir hata oluştu.') + '\n\nİnternet bağlantınızı kontrol edip tekrar deneyin.',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop'a tıklayınca klavye kapansın */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kbWrap}
        >
        <View style={[styles.card, shadows.lg]}>
          <LinearGradient
            colors={gradients.moduleHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={styles.headerEyebrow}>{sideLabelTr ? `ÖDEME AL · ${sideLabelTr.toUpperCase()}` : 'ÖDEME AL'}</Text>
            <Text style={styles.headerTitle}>{customer.fullName || '—'}</Text>
            <View style={styles.headerGoldLine} />
          </LinearGradient>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.remainBlock}>
              <Text style={styles.remainLabel}>KALAN BORÇ</Text>
              <Text style={styles.remainValue}>{formatTL(remaining)}</Text>
            </View>

            <Text style={styles.fieldLabel}>Ödenecek Tutar (₺)</Text>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(formatAmountTR(v))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Ödeme Türü</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  method === PAYMENT_CASH && styles.methodBtnActive,
                ]}
                onPress={() => setMethod(PAYMENT_CASH)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.methodTxt,
                    method === PAYMENT_CASH && styles.methodTxtActive,
                  ]}
                >
                  Nakit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  method === PAYMENT_CARD && styles.methodBtnActive,
                ]}
                onPress={() => setMethod(PAYMENT_CARD)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.methodTxt,
                    method === PAYMENT_CARD && styles.methodTxtActive,
                  ]}
                >
                  Kart
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Not (opsiyonel)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Örn. Mayıs taksiti, geç ödedi"
              placeholderTextColor={colors.textFaint}
              style={styles.noteInput}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={onClose}
                disabled={busy}
              >
                <Text style={styles.btnGhostTxt}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirm}
                disabled={busy}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={gradients.goldButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnConfirm}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.primaryDeep} />
                  ) : (
                    <Text style={styles.btnConfirmTxt}>Ödemeyi Onayla</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  kbWrap: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    borderRadius: radii.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerEyebrow: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 10, letterSpacing: 2 },
  headerTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 22, marginTop: 2 },
  headerGoldLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },

  body: { padding: spacing.xl },

  remainBlock: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 92, 92, 0.4)',
    marginBottom: spacing.lg,
  },
  remainLabel: { fontSize: 10, fontWeight: '800', color: colors.danger, letterSpacing: 1.5 },
  remainValue: { fontSize: 28, fontWeight: '900', color: colors.danger, marginTop: 4 },

  fieldLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  noteInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 56,
    fontSize: 14,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
  },

  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  methodBtnActive: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  methodTxt: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
  methodTxtActive: { color: colors.gold, fontWeight: '800' },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '700' },
  btnConfirm: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirmTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
