import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme/colors';

// Kompakt "[−] 3 taksit [+]" sayaç — küçük ve şık.
export default function NumberStepper({ value, onChange, min = 0, max = 99, disabled }) {
  const num = parseInt(value, 10);
  const current = Number.isFinite(num) ? num : 0;

  const set = (n) => {
    const clamped = Math.max(min, Math.min(max, n));
    onChange(clamped === 0 ? '' : String(clamped));
  };

  const dec = () => set(current - 1);
  const inc = () => set(current + 1);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={dec}
        disabled={disabled || current <= min}
        style={[styles.btn, (disabled || current <= min) && styles.btnDisabled]}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnTxt, (disabled || current <= min) && styles.btnTxtDisabled]}>−</Text>
      </TouchableOpacity>

      <View style={styles.valueBox}>
        <Text style={styles.value}>{current}</Text>
        <Text style={styles.suffix}>taksit</Text>
      </View>

      <TouchableOpacity
        onPress={inc}
        disabled={disabled || current >= max}
        style={[styles.btn, (disabled || current >= max) && styles.btnDisabled]}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnTxt, (disabled || current >= max) && styles.btnTxtDisabled]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgInput,
    overflow: 'hidden',
    alignSelf: 'flex-start', // tüm satırı kaplamasın, sola yaslı kompakt dursun
  },
  btn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  btnDisabled: { opacity: 0.35 },
  btnTxt: { color: colors.gold, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  btnTxtDisabled: { color: colors.textMuted },
  valueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    minWidth: 90,
  },
  value: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  suffix: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
