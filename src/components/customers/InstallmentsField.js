import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '../ui/WebDatePicker';
import {
  PAYMENT_CASH,
  PAYMENT_CARD,
  paymentMethodLabel,
} from '../../services/customerService';
import { colors, radii, spacing } from '../../theme/colors';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Tarih seç';

const formatTL = (n) =>
  (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

// installments: [{ id, date: Date, amount: string|number, method }]
export default function InstallmentsField({ installments, onChange, disabled }) {
  const [openPickerId, setOpenPickerId] = useState(null);

  const addRow = () => {
    const row = {
      id: Date.now() + Math.random(),
      date: new Date(),
      amount: '',
      method: PAYMENT_CASH,
    };
    onChange([...installments, row]);
  };

  const updateRow = (id, patch) => {
    onChange(installments.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeRow = (id) => {
    onChange(installments.filter((it) => it.id !== id));
  };

  const total = installments.reduce((s, it) => {
    const n = parseFloat(String(it.amount).replace(',', '.'));
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>ÖDENEN TAKSİTLER</Text>
        {installments.length > 0 && (
          <Text style={styles.totalTxt}>Toplam: {formatTL(total)}</Text>
        )}
      </View>

      {installments.map((it, idx) => (
        <View key={it.id} style={styles.row}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexTxt}>{idx + 1}</Text>
          </View>

          {/* Tarih — web'de input overlay olarak hep mount edili */}
          <View style={styles.dateWrap}>
            <TouchableOpacity
              style={styles.dateBtnInner}
              onPress={() => setOpenPickerId(openPickerId === it.id ? null : it.id)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.dateTxt}>{formatDate(it.date)}</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && !disabled && (
              <DateTimePicker
                value={it.date instanceof Date ? it.date : new Date(it.date || Date.now())}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (event.type !== 'dismissed' && selectedDate) {
                    updateRow(it.id, { date: selectedDate });
                  }
                }}
              />
            )}
          </View>

          {/* Tutar */}
          <TextInput
            style={styles.amountInput}
            value={String(it.amount)}
            onChangeText={(v) => updateRow(it.id, { amount: v })}
            placeholder="Tutar"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            editable={!disabled}
          />

          {/* Nakit/Kart toggle */}
          <TouchableOpacity
            style={styles.methodBtn}
            onPress={() =>
              updateRow(it.id, {
                method: it.method === PAYMENT_CASH ? PAYMENT_CARD : PAYMENT_CASH,
              })
            }
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.methodTxt}>{paymentMethodLabel(it.method)}</Text>
          </TouchableOpacity>

          {/* Sil */}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeRow(it.id)}
            disabled={disabled}
          >
            <Text style={styles.removeTxt}>✕</Text>
          </TouchableOpacity>

          {/* Date picker (satır altında açılır — sadece native, web'de yukarıda overlay) */}
          {Platform.OS !== 'web' && openPickerId === it.id && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={it.date instanceof Date ? it.date : new Date(it.date || Date.now())}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setOpenPickerId(null);
                  if (event.type !== 'dismissed' && selectedDate) {
                    updateRow(it.id, { date: selectedDate });
                  }
                }}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.pickerDone} onPress={() => setOpenPickerId(null)}>
                  <Text style={styles.pickerDoneTxt}>Tamam</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}

      {!disabled && (
        <TouchableOpacity style={styles.addBtn} onPress={addRow} activeOpacity={0.7}>
          <Text style={styles.addTxt}>+ Taksit Ekle</Text>
        </TouchableOpacity>
      )}

      {installments.length === 0 && (
        <Text style={styles.hint}>Müşteri ödeme yaptıkça taksit ekleyebilirsin.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  totalTxt: { fontSize: 12, color: colors.success, fontWeight: '800' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 12 },

  // Web overlay pattern: wrapper boyutu tutar, inner görseli
  dateWrap: {
    flex: 1.3,
    minWidth: 110,
    position: 'relative',
  },
  dateBtnInner: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.bgInput,
  },
  dateBtn: {
    flex: 1.3,
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.bgInput,
  },
  dateTxt: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

  amountInput: {
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
    fontSize: 13,
  },

  methodBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
  },
  methodTxt: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },

  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(226,92,92,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTxt: { color: colors.danger, fontWeight: '800', fontSize: 13 },

  pickerWrap: { width: '100%' },
  pickerDone: {
    alignSelf: 'flex-end',
    marginTop: 4,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pickerDoneTxt: { color: colors.gold, fontWeight: '700', fontSize: 13 },

  addBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
  },
  addTxt: { color: colors.gold, fontWeight: '800', fontSize: 13 },

  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});
