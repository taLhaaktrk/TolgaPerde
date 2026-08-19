import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
import { SIDE_LABEL, SIDE_BRIDE, SIDE_GROOM } from '../../utils/customerSides';

const formatDate = (d) =>
  d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatTL = (n) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const parseAmount = parseAmountTR;

// Birleşik form — hem geçmiş taksitler (opsiyonel) hem gelecek plan (opsiyonel) bir arada.
export default function NewCustomerModal({ visible, onClose, onSaved, editingCustomer = null }) {
  const isEditing = !!editingCustomer;

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

  // ── Kız/Erkek tarafı split ──────────────────────────────────
  const [isSplit, setIsSplit] = useState(false);
  // Kız tarafı
  const [bridePhone, setBridePhone] = useState('');
  const [brideTotal, setBrideTotal] = useState('');
  const [brideDeposit, setBrideDeposit] = useState('');
  const [bridePlannedCount, setBridePlannedCount] = useState('');
  const [brideInstallments, setBrideInstallments] = useState([]);
  // Erkek tarafı
  const [groomPhone, setGroomPhone] = useState('');
  const [groomTotal, setGroomTotal] = useState('');
  const [groomDeposit, setGroomDeposit] = useState('');
  const [groomPlannedCount, setGroomPlannedCount] = useState('');
  const [groomInstallments, setGroomInstallments] = useState([]);

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

      // ── Split verilerini yükle (varsa)
      const split = !!editingCustomer.isSplit;
      setIsSplit(split);
      if (split) {
        const b = editingCustomer.sides?.bride || {};
        const g = editingCustomer.sides?.groom || {};
        setBridePhone(formatPhoneTR(b.phone || ''));
        setBrideTotal(b.totalAmount ? formatAmountTR(String(b.totalAmount)) : '');
        setBrideDeposit(b.deposit ? formatAmountTR(String(b.deposit)) : '');
        setBridePlannedCount(b.plannedInstallments ? String(b.plannedInstallments) : '');
        setBrideInstallments((b.paymentHistory || []).map((p, i) => ({
          id: `existing-bride-${i}-${Date.now()}`,
          date: p.at?.toDate?.() || (p.at instanceof Date ? p.at : new Date()),
          amount: String(p.amount || ''),
          method: p.method || 'cash',
        })));
        setGroomPhone(formatPhoneTR(g.phone || ''));
        setGroomTotal(g.totalAmount ? formatAmountTR(String(g.totalAmount)) : '');
        setGroomDeposit(g.deposit ? formatAmountTR(String(g.deposit)) : '');
        setGroomPlannedCount(g.plannedInstallments ? String(g.plannedInstallments) : '');
        setGroomInstallments((g.paymentHistory || []).map((p, i) => ({
          id: `existing-groom-${i}-${Date.now()}`,
          date: p.at?.toDate?.() || (p.at instanceof Date ? p.at : new Date()),
          amount: String(p.amount || ''),
          method: p.method || 'cash',
        })));
      }
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

  // ── Split hesaplamaları ─────────────────────────────────────
  const brideTotalNum = parseAmount(brideTotal);
  const brideDepositNum = parseAmount(brideDeposit);
  const brideInstallmentsTotal = useMemo(
    () => brideInstallments.reduce((s, it) => {
      const n = parseFloat(String(it.amount).replace(',', '.'));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0),
    [brideInstallments]
  );
  const brideRemaining = Math.max(brideTotalNum - brideDepositNum - brideInstallmentsTotal, 0);

  const groomTotalNum = parseAmount(groomTotal);
  const groomDepositNum = parseAmount(groomDeposit);
  const groomInstallmentsTotal = useMemo(
    () => groomInstallments.reduce((s, it) => {
      const n = parseFloat(String(it.amount).replace(',', '.'));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0),
    [groomInstallments]
  );
  const groomRemaining = Math.max(groomTotalNum - groomDepositNum - groomInstallmentsTotal, 0);

  // Split açıkken bir tarafa yazınca diğer taraf otomatik tamamlansın (Toplam - girilen).
  // Kullanıcı sadece bir tarafı doldurduğunda diğerini otomatik doldur.
  const handleBrideTotalChange = (v) => {
    const formatted = formatAmountTR(v);
    setBrideTotal(formatted);
    // Ana toplam varsa erkek tarafını otomatik tamamla
    if (totalNum > 0) {
      const brideNum = parseAmount(formatted);
      const remainderForGroom = Math.max(totalNum - brideNum, 0);
      setGroomTotal(remainderForGroom > 0 ? formatAmountTR(String(remainderForGroom)) : '');
    }
  };
  const handleGroomTotalChange = (v) => {
    const formatted = formatAmountTR(v);
    setGroomTotal(formatted);
    if (totalNum > 0) {
      const groomNum = parseAmount(formatted);
      const remainderForBride = Math.max(totalNum - groomNum, 0);
      setBrideTotal(remainderForBride > 0 ? formatAmountTR(String(remainderForBride)) : '');
    }
  };

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
    // split state reset
    setIsSplit(false);
    setBridePhone(''); setBrideTotal(''); setBrideDeposit(''); setBridePlannedCount(''); setBrideInstallments([]);
    setGroomPhone(''); setGroomTotal(''); setGroomDeposit(''); setGroomPlannedCount(''); setGroomInstallments([]);
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
    // Split iken ana totalAmount OTOMATİK hesaplanır (bride + groom). Kullanıcı
    // elle ana total giremez → top-level ve sides tutarları GARANTİ eşit olur,
    // istatistiklerde tutarsızlık olmaz. Sadece iki tarafın 0 olmadığını kontrol et.
    if (isSplit && (brideTotalNum + groomTotalNum) <= 0) {
      Alert.alert(
        'Tutar Gerekli',
        'Kız ve Erkek tarafından en az birine tutar girmelisin.',
        [{ text: 'Tamam' }],
        { tone: 'warning' }
      );
      return;
    }

    setBusy(true);
    try {
      // Ana müşteri payload'ı — split ise top-level fieldlar TOPLAM olarak gider
      // (istatistikler eski akışla çalışmaya devam etsin).
      // Ana telefon: split ise kız tarafının telefonu (yoksa erkek).
      const mainPhone = isSplit
        ? ((bridePhone || groomPhone).replace(/\s/g, '').trim())
        : phone.replace(/\s/g, '').trim();

      const customer = {
        fullName: fullName.trim(),
        phone: mainPhone,
        // Split iken TÜM top-level tutarlar sides toplamından türetilir → tutarlı
        totalAmount: isSplit ? (brideTotalNum + groomTotalNum) : totalNum,
        deposit: isSplit ? (brideDepositNum + groomDepositNum) : depositNum,
        remainingAmount: isSplit ? (brideRemaining + groomRemaining) : remaining,
        notes: notes.trim(),
        orderDate: orderDate.toISOString(),
        // Ödenmiş taksitler (geçmiş) — opsiyonel, boş olabilir
        installments: installments.map((it) => ({ date: it.date, amount: it.amount, method: it.method })),
        // Planlanan taksit sayısı (gelecek) — kalan tutar için plan üretilir
        plannedInstallments: parseInt(plannedCount, 10) || 0,
        // ── Split bilgisi ──
        isSplit,
        ...(isSplit ? {
          split: {
            bride: {
              phone: bridePhone.replace(/\s/g, '').trim(),
              totalAmount: brideTotalNum,
              deposit: brideDepositNum,
              remainingAmount: brideRemaining,
              plannedInstallments: parseInt(bridePlannedCount, 10) || 0,
              installments: brideInstallments.map((it) => ({ date: it.date, amount: it.amount, method: it.method })),
            },
            groom: {
              phone: groomPhone.replace(/\s/g, '').trim(),
              totalAmount: groomTotalNum,
              deposit: groomDepositNum,
              remainingAmount: groomRemaining,
              plannedInstallments: parseInt(groomPlannedCount, 10) || 0,
              installments: groomInstallments.map((it) => ({ date: it.date, amount: it.amount, method: it.method })),
            },
          },
        } : {}),
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
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
          {/* Header — sade koyu, sadece başlık + kapat butonu */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>
                {isEditing ? 'DÜZENLE' : 'YENİ KAYIT'}
              </Text>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Müşteri Düzenle' : 'Müşteri Ekle'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* ── KİMLİK BİLGİLERİ ── */}
            <Text style={styles.sectionHeader}>KİMLİK BİLGİLERİ</Text>
            <View style={styles.row2}>
              <Field
                label="Ad Soyad"
                value={fullName}
                onChangeText={(v) => setFullName(capitalizeNameTR(v))}
                placeholder={isSplit ? 'Örn. Ayşe & Mehmet Düğün' : 'Örn. Ayşe Yılmaz'}
                autoCapitalize="words"
                style={{ flex: isSplit ? 1 : 1.4 }}
              />
              {!isSplit && (
                <Field
                  label="Telefon"
                  value={phone}
                  onChangeText={(v) => setPhone(formatPhoneTR(v))}
                  placeholder="05XX XXX XXXX"
                  keyboardType="phone-pad"
                  maxLength={13}
                  style={{ flex: 1 }}
                />
              )}
            </View>

            {/* iOS tarzı switch — Kız/Erkek split */}
            <TouchableOpacity
              onPress={() => setIsSplit((v) => !v)}
              activeOpacity={0.7}
              style={styles.switchRow}
              disabled={busy}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Kız / Erkek tarafı ayrı hesap</Text>
                <Text style={styles.switchHint}>Düğün müşterilerinde iki tarafa bölünen ödemeler için</Text>
              </View>
              <View style={[styles.switchTrack, isSplit && styles.switchTrackOn]}>
                <View style={[styles.switchThumb, isSplit && styles.switchThumbOn]} />
              </View>
            </TouchableOpacity>

            {/* ── ÖDEME PLANI ── */}
            <Text style={styles.sectionHeader}>ÖDEME PLANI</Text>
            {/* Split iken ana Toplam/Peşinat GİZLİ — sides toplamından otomatik hesaplanır.
                Böylece kullanıcı elle tutarsız değer giremez. */}
            {!isSplit && (
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
            )}

            {/* Split alanları — iki taraf */}
            {isSplit && (
              <>
                <SideBlock
                  label="KIZ TARAFI"
                  accent={colors.gold}
                  phone={bridePhone} onPhoneChange={(v) => setBridePhone(formatPhoneTR(v))}
                  amount={brideTotal} onAmountChange={handleBrideTotalChange}
                  deposit={brideDeposit} onDepositChange={(v) => setBrideDeposit(formatAmountTR(v))}
                  plannedCount={bridePlannedCount} onPlannedChange={setBridePlannedCount}
                  installments={brideInstallments} onInstallmentsChange={setBrideInstallments}
                  remaining={brideRemaining}
                  installmentsTotal={brideInstallmentsTotal}
                  totalNum={brideTotalNum}
                  depositNum={brideDepositNum}
                  busy={busy}
                />
                <SideBlock
                  label="ERKEK TARAFI"
                  accent={colors.info}
                  phone={groomPhone} onPhoneChange={(v) => setGroomPhone(formatPhoneTR(v))}
                  amount={groomTotal} onAmountChange={handleGroomTotalChange}
                  deposit={groomDeposit} onDepositChange={(v) => setGroomDeposit(formatAmountTR(v))}
                  plannedCount={groomPlannedCount} onPlannedChange={setGroomPlannedCount}
                  installments={groomInstallments} onInstallmentsChange={setGroomInstallments}
                  remaining={groomRemaining}
                  installmentsTotal={groomInstallmentsTotal}
                  totalNum={groomTotalNum}
                  depositNum={groomDepositNum}
                  busy={busy}
                />
              </>
            )}

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

            {!isSplit && (
              <>
                {/* Ödenen taksitler — geçmişte ödenmiş taksitler (opsiyonel) */}
                <InstallmentsField
                  installments={installments}
                  onChange={setInstallments}
                  disabled={busy}
                />
                {/* Planlanan taksit sayısı — kalan tutar için gelecek plan (opsiyonel) */}
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
              </>
            )}

            {isSplit ? (
              <View style={styles.remainingBox}>
                <View style={styles.remainingBreakdown}>
                  <Text style={styles.breakdownTxt}>Kız Tarafı Kalan {formatTL(brideRemaining)}</Text>
                  <Text style={styles.breakdownTxt}>Erkek Tarafı Kalan {formatTL(groomRemaining)}</Text>
                </View>
                <View style={styles.remainingDivider} />
                <Text style={styles.remainingLabel}>TOPLAM KALAN BORÇ</Text>
                <Text style={styles.remainingValue}>{formatTL(brideRemaining + groomRemaining)}</Text>
              </View>
            ) : (
              <View style={styles.remainingBox}>
                <View style={styles.remainingBreakdown}>
                  <Text style={styles.breakdownTxt}>Toplam {formatTL(totalNum)}</Text>
                  <Text style={styles.breakdownMinus}>− Peşinat {formatTL(depositNum)}</Text>
                  {installmentsTotal > 0 && (
                    <Text style={styles.breakdownMinus}>− Ödenmiş Taksitler {formatTL(installmentsTotal)}</Text>
                  )}
                </View>
                <View style={styles.remainingDivider} />
                <Text style={styles.remainingLabel}>KALAN BORÇ</Text>
                <Text style={styles.remainingValue}>{formatTL(remaining)}</Text>
              </View>
            )}

            {/* ── ÖLÇÜ VE NOTLAR ── */}
            <Text style={styles.sectionHeader}>ÖLÇÜ VE NOTLAR</Text>
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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

// ── Kız/Erkek tarafı için tek blok ─────────────────────────
function SideBlock({
  label, accent,
  phone, onPhoneChange,
  amount, onAmountChange,
  deposit, onDepositChange,
  plannedCount, onPlannedChange,
  installments, onInstallmentsChange,
  busy,
  remaining, installmentsTotal, totalNum, depositNum,
}) {
  return (
    <View style={[styles.sideBlock, { borderLeftColor: accent }]}>
      <Text style={[styles.sideBlockLabel, { color: accent }]}>{label}</Text>
      <View style={styles.row2}>
        <Field
          label="Telefon"
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="05XX XXX XXXX"
          keyboardType="phone-pad"
          maxLength={13}
          style={{ flex: 1 }}
        />
        <Field
          label="Bu Tarafın Tutarı (₺)"
          value={amount}
          onChangeText={onAmountChange}
          placeholder="0"
          keyboardType="number-pad"
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.row2}>
        <Field
          label="Peşinat (₺)"
          value={deposit}
          onChangeText={onDepositChange}
          placeholder="0"
          keyboardType="number-pad"
          style={{ flex: 1 }}
        />
        <View style={{ flex: 1 }} />
      </View>
      <InstallmentsField
        installments={installments}
        onChange={onInstallmentsChange}
        disabled={busy}
      />
      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.fieldLabel}>Planlanan Taksit Sayısı</Text>
        <NumberStepper
          value={plannedCount}
          onChange={onPlannedChange}
          min={0}
          max={36}
          disabled={busy}
        />
      </View>
      <View style={styles.sideBlockSummary}>
        <Text style={styles.sideBlockSumTxt}>
          Bu taraf kalan: <Text style={{ color: accent, fontWeight: '900' }}>
            {(remaining || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </Text>
        </Text>
      </View>
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
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.35)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(92, 13, 20, 0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },
  headerEyebrow: { color: colors.textMuted, fontWeight: '700', fontSize: 10, letterSpacing: 2 },
  headerTitle: { color: colors.gold, fontWeight: '900', fontSize: 22, marginTop: 3, letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: colors.textSecondary, fontWeight: '700' },

  body: { padding: spacing.xl, paddingBottom: spacing.xl },
  row2: { flexDirection: 'row', gap: spacing.md },

  // ── Section header — altın accent bar sol + altın text ───
  sectionHeader: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    paddingLeft: 10,
    paddingBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.20)',
  },
  section: {
    marginBottom: spacing.lg,
  },

  // ── iOS tarzı switch satırı ──────────────────────────────
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  switchHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: colors.gold,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    transform: [{ translateX: 18 }],
  },

  // ── Split blok (kız/erkek tarafı) ────────────────────────
  sideBlock: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sideBlockLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  sideBlockSummary: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sideBlockSumTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  fieldLabel: {
    fontSize: 10,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16, // iOS Safari zoom bug fix — 16+ olmalı
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 70,
    paddingTop: 10,
  },

  remainingBox: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 92, 92, 0.35)',
    alignItems: 'center',
  },
  remainingLabel: { fontSize: 11, fontWeight: '900', color: colors.danger, letterSpacing: 2 },
  remainingValue: { fontSize: 28, fontWeight: '900', color: colors.danger, marginTop: 4, letterSpacing: -0.5 },
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
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '700' },
  btnSave: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  btnSaveTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },

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
