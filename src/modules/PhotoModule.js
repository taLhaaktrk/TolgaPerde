import React from 'react';
import { View, StyleSheet } from 'react-native';
import ModuleHeader from '../components/shell/ModuleHeader';
import PhotoArchivePanel from '../components/PhotoArchivePanel';
import { colors, spacing } from '../theme/colors';

export default function PhotoModule() {
  return (
    <View style={styles.flex}>
      <ModuleHeader eyebrow="GEÇMİŞ DEFTERLER" title="Fotoğraf Arşivi" />
      <View style={styles.contentWrap}>
        <PhotoArchivePanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentWrap: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgPanel,
  },
});
