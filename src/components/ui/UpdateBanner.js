// PWA "Yeni sürüm hazır" banner'ı — sadece web'de görünür.
// useVersionCheck true dönerse üstte yüzen altın bir bildirim gösterir.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useVersionCheck from '../../hooks/useVersionCheck';
import { colors, radii, shadows, spacing } from '../../theme/colors';

export default function UpdateBanner() {
  const { updateAvailable, reload } = useVersionCheck();

  if (Platform.OS !== 'web') return null;
  if (!updateAvailable) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.banner, shadows.md]}>
        <LinearGradient
          colors={['#C9A961', '#B08D45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.title}>Yeni Sürüm Hazır</Text>
          <Text style={styles.subtitle}>
            Uygulamanın güncel sürümü mevcut. Yenile'ye dokun.
          </Text>
        </View>
        <TouchableOpacity
          onPress={reload}
          activeOpacity={0.85}
          style={styles.btn}
        >
          <Text style={styles.btnTxt}>Yenile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    padding: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    maxWidth: 520,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  title: {
    color: colors.primaryDeep,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(24, 8, 12, 0.75)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.primaryDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  btnTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
});
