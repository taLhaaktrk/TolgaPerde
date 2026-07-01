import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Alert from '../../utils/alert';
import DateTimePicker from '../ui/WebDatePicker';
import NumberStepper from '../ui/NumberStepper';
import MeasurementPhotosField from './MeasurementPhotosField';
import InstallmentsField from './InstallmentsField';
import {
  saveCustomerWithPhotos,
  updateCustomerWithPhotos,
} from '../../services/customerService';
import { formatPhoneTR, formatAmountTR, parseAmountTR, capitalizeNameTR } from '../../utils/format';
import { addMonths } from '../../utils/installments';
import { colors, gradients, radii, spacing, shadows } from '../../theme/colors';

const formatDate = (d) =>
  d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatTL = (n) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const parseAmount = parseAmountTR;

// mode: 'new' (yeni müşteri — planlanan taksit sayısı) | 'archive' (eski müşteri — geçmiş taksit listesi)
export default function NewCustomerModal({ visible, onClose, onSaved, editingCustomer = null, mode = 'new' }) {
  const isEditing = !!editingCustomer;
  // Edit'te kayıtlı veriye göre, yoksa prop'tan: arşiv mı?
  const isArchive = isEditing
    ? (editingCustomer.plannedInstallments ? false : (editingCustomer.paymentHistory || []).length > 0) || mode === 'archive'
    : mode === 'archive';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [plannedCount, setPlannedCount] = useState('');
  const [orderDate, setOrderDate] = useState(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edit modu — modal her açıldığında mevcut müşteri verisini doldur.
  React.useEffect(() => {
    if (!visible) return;
    if (isEditing && editingCustomer) {
      setFullName(editingCustomer.fullName || '');
      setPhone(formatPhoneTR(editingCustomer.phone || ''));
      setTotal(editingCustomer.totalAmount ? formatAmountTR(String(editingCustomer.totalAmount)) : '');
      setDeposit(editingCustomer.deposit ? formatAmountTR(String(editingCustomer.deposit)) : '');
      setNotes(editingCustomer.notes || '');
      // Mevcut fotoğrafları "remote" işaretiyle göster
      const existing = (editingCustomer.measurementPhotos || []).map((url, i) => ({
        uri: url,
        remote: true,
        path: editingCustomer.measurementPhotoPaths?.[i] || null,
      }));
      setPhotos(existing);
      // Mevcut taksitleri forma yükle (Firestore Timestamp -> Date)
      const existingInstallments = (editingCustomer.paymentHistory || []).map((p, i) => ({
        id: `existing-${i}-${Date.now()}`,
        date: p.at?.toDate?.() || (p.at instanceof Date ? p.at : new Date()),
        amount: String(p.amount || ''),
        method: p.method || 'cash',
      }));
      setInstallments(existingInstallments);
      setPlannedCount(editingCustomer.plannedInstallments ? String(editingCustomer.plannedInstallments) : '');
      const od = editingCustomer.orderDate?.toDate?.() || new Date();
      setOrderDate(od);
    } else if (visible && !isEditing) {
      // Yeni kayıt — temiz başla
      setInstallments([]);
      setPlannedCount('');
    }
  }, [visible, isEditing, editingCustomer]);

  const totalNum = parseAmount(total);
  const depositNum = parseAmount(deposit);
  const installmentsTotal = useMemo(
    () =>
      installments.reduce((s, it) => {
        const n = parseFloat(String(it.amount).replace(',', '.'));
        return s + (Number.isFinite(n) ? n : 0);
      }, 0),
    [installments]
  );
  // Kalan Borç = Toplam − Peşinat − Ödenen Taksitler
  const remaining = useMemo(
    () => Math.max(totalNum - depositNum - installmentsTotal, 0),
    [totalNum, depositNum, installmentsTotal]
  );

  const reset = () => {
    setFullName('');
    setPhone('');
    setTotal('');
    setDeposit('');
    setNotes('');
    setPhotos([]);
    setInstallments([]);
    setPlannedCount('');
    setOrderDate(new Date());
    setDateOpen(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        'Müşteri Adı Gerekli',
        'Kaydı tamamlamak için müşterinin adını girmelisiniz.',
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }
    setBusy(true);
    try {
      const customer = {
        fullName: fullName.trim(),
        phone: phone.replace(/\s/g, '').trim(), // depolamada sadece rakam, görünümde format
        totalAmount: totalNum,
        deposit: depositNum,
        remainingAmount: remaining,
        notes: notes.trim(),
        orderDate: orderDate.toISOString(),
        // Arşiv (eski müşteri): geçmiş taksit listesi. Yeni müşteri: boş.
        installments: isArchive
          ? installments.map((it) => ({ date: it.date, amount: it.amount, method: it.method }))
          : [],
        // Yeni müşteri: planlanan taksit sayısı (not). Arşivde 0.
        plannedInstallments: isArchive ? 0 : (parseInt(plannedCount, 10) || 0),
      };

      let result;
      if (isEditing) {
        result = await updateCustomerWithPhotos({
          customerId: editingCustomer.id,
          customer,
          photos,
        });
      } else {
        result = await saveCustomerWithPhotos({ customer, photos });
      }

      // Önce modal'ı kapat — sonra Alert göster (iç içe Modal'ları engellemek için)
      reset();
      onSaved?.(result);
      onClose?.();
      Alert.alert(
        isEditing ? 'Bilgiler Güncellendi' : 'Müşteri Kaydedildi',
        isEditing
          ? `${customer.fullName} adlı müşterinin bilgileri başarıyla güncellendi.`
          : `${customer.fullName} müşteri listesine eklendi${photos.length ? ` (${photos.length} fotoğraf ile)` : ''}.`,
        [{ text: 'Tamam' }],
        { tone: 'success' }
      );
    } catch (e) {
      console.warn(isEditing ? 'Müşteri güncelleme hatası:' : 'Müşteri kayıt hatası:', e);
      Alert.alert(
        isEditing ? 'Güncelleme Yapılamadı' : 'Kayıt Yapılamadı',
        (e.message || 'Bilinmeyen bir hata oluştu.') + '\n\nİnternet bağlantınızı kontrol edip tekrar deneyin.',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.lg]}>
          <LinearGradient
            colors={gradients.moduleHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>
                {isEditing ? 'DÜZENLE' : (isArchive ? 'ESKİ MÜŞTERİ (ARŞİV)' : 'YENİ KAYIT')}
              </Text>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Müşteri Düzenle' : (isArchive ? 'Eski Müşteri Ekle' : 'Yeni Müşteri Ekle')}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerGoldLine} />
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.row2}>
              <Field
                label="Ad Soyad"
                value={fullName}
                onChangeText={(v) => setFullName(capitalizeNameTR(v))}
                placeholder="Örn. Ayşe Yılmaz"
                autoCapitalize="words"
                style={{ flex: 1.4 }}
              />
              <Field
                label="Telefon"
                value={phone}
                onChangeText={(v) => setPhone(formatPhoneTR(v))}
                placeholder="05XX XXX XXXX"
                keyboardType="phone-pad"
                maxLength={13}
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.row2}>
              <Field
                label="Toplam Tutar (₺)"
                value={total}
                onChangeText={(v) => setTotal(formatAmountTR(v))}
                placeholder="0"
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
              <Field
                label="Alınan Peşinat (₺)"
                value={deposit}
                onChangeText={(v) => setDeposit(formatAmountTR(v))}
                placeholder="0"
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>Sipariş Tarihi</Text>
              {/* Web/PWA: input overlay olarak hep mount edili, gesture chain bozulmaz.
                  Native: TouchableOpacity ile setDateOpen(true) tetikler. */}
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={[styles.input, styles.dateBtn]}
                  onPress={() => setDateOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateBtnTxt}>{formatDate(orderDate)}</Text>
                  <Text style={styles.dateHint}>değiştir ›</Text>
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                  <DateTimePicker
                    value={orderDate}
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (event.type !== 'dismissed' && selectedDate) {
                        setOrderDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
              {Platform.OS !== 'web' && dateOpen && (
                <DateTimePicker
                  value={orderDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setDateOpen(false);
                    if (event.type !== 'dismissed' && selectedDate) {
                      setOrderDate(selectedDate);
                    }
                  }}
                  themeVariant="dark"
                />
              )}
              {Platform.OS === 'ios' && dateOpen && (
                <TouchableOpacity
                  style={styles.dateDoneBtn}
                  onPress={() => setDateOpen(false)}
                >
                  <Text style={styles.dateDoneTxt}>Tamam</Text>
                </TouchableOpacity>
              )}
            </View>

            {isArchive ? (
              // ESKİ MÜŞTERİ: geçmişte ödenen taksitlerin tam listesi
              <InstallmentsField
                installments={installments}
                onChange={setInstallments}
                disabled={busy}
              />
            ) : (
              // YENİ MÜŞTERİ: sadece planlanan taksit sayısı (stepper ile)
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.fieldLabel}>Planlanan Taksit Sayısı (opsiyonel)</Text>
                <NumberStepper
                  value={plannedCount}
                  onChange={setPlannedCount}
                  min={0}
                  max={36}
                  disabled={busy}
                />
                {(() => {
                  const n = parseInt(plannedCount, 10) || 0;
                  if (n <= 0 || remaining <= 0) return null;
                  const per = remaining / n;
                  const firstDue = addMonths(orderDate, 1);
                  return (
                    <View style={styles.planPreview}>
                      <Text style={styles.planPreviewIcon}>📅</Text>
                      <Text style={styles.planPreviewTxt}>
                        İlk taksit <Text style={styles.planPreviewBold}>{formatDate(firstDue)}</Text>
                        {'\n'}Her ay <Text style={styles.planPreviewBold}>{formatTL(per)}</Text> · toplam {n} ödeme
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            <View style={styles.remainingBox}>
              <View style={styles.remainingBreakdown}>
                <Text style={styles.breakdownTxt}>Toplam {formatTL(totalNum)}</Text>
                <Text style={styles.breakdownMinus}>− Peşinat {formatTL(depositNum)}</Text>
                {isArchive && (
                  <Text style={styles.breakdownMinus}>− Taksitler {formatTL(installmentsTotal)}</Text>
                )}
              </View>
              <View style={styles.remainingDivider} />
              <Text style={styles.remainingLabel}>KALAN BORÇ</Text>
              <Text style={styles.remainingValue}>{formatTL(remaining)}</Text>
            </View>

            <MeasurementPhotosField
              photos={photos}
              onChange={setPhotos}
              disabled={busy}
            />

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.fieldLabel}>Notlar (opsiyonel)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Örn. Yusuf'un kardeşi, salon perdesi sipariş etti"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.notesInput]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={handleClose}
                disabled={busy}
              >
                <Text style={styles.btnGhostTxt}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={busy}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={gradients.goldButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnSave}
                >
                  {busy ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={colors.primaryDeep} />
                      <Text style={styles.btnSaveTxt}>
                        {photos.length > 0 ? 'Yükleniyor…' : (isEditing ? 'Güncelleniyor…' : 'Kaydediliyor…')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.btnSaveTxt}>
                      {isEditing ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, style, ...inputProps }) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: radii.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerEyebrow: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 10, letterSpacing: 2 },
  headerTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 22, marginTop: 2 },
  headerGoldLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.gold, opacity: 0.6 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#FFF', fontWeight: '700' },

  body: { padding: spacing.xl, paddingBottom: spacing.xl },
  row2: { flexDirection: 'row', gap: spacing.md },

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
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 70,
    paddingTop: 10,
  },

  remainingBox: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(226, 92, 92, 0.4)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  remainingLabel: { fontSize: 10, fontWeight: '800', color: colors.danger, letterSpacing: 1.5 },
  remainingValue: { fontSize: 24, fontWeight: '900', color: colors.danger, marginTop: 4 },
  remainingBreakdown: { alignItems: 'center', gap: 2 },
  breakdownTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  breakdownMinus: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  remainingDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(226,92,92,0.3)',
    marginVertical: spacing.sm,
  },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '700' },
  btnSave: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  dateBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBtnTxt: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  dateHint: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  dateDoneBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dateDoneTxt: { color: colors.gold, fontWeight: '700', fontSize: 13 },

  planPreview: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.goldSoft,
    borderColor: 'rgba(201, 169, 97, 0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  planPreviewIcon: { fontSize: 16, marginTop: 1 },
  planPreviewTxt: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  planPreviewBold: { color: colors.gold, fontWeight: '800' },
});
