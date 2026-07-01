import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/colors';

// Web/masaüstü stub'ı. Metro web platformunda OTOMATİK olarak bu dosyayı seçer,
// böylece @shopify/react-native-skia (CanvasKit/WASM) web paketine hiç girmez.
// Çizim özelliği yalnızca iPad'de aktif olduğu için burada sadece bilgi mesajı gösterilir.
export default function DrawingPanel() {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Çizim yalnızca iPad'de</Text>
        <Text style={styles.sub}>
          Ölçü çizim tahtası Apple Pencil için tablete özeldir.
          Bilgisayar ve telefonda müşteri, finans ve fotoğraf işlemlerini kullanabilirsin.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: spacing.sm, lineHeight: 19 },
});
