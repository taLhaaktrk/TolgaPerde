import React from 'react';
import { View, StyleSheet } from 'react-native';
import ModuleHeader from '../components/shell/ModuleHeader';
import DrawingPanel from '../components/DrawingPanel';
import { colors, spacing } from '../theme/colors';

export default function DesignModule() {
  return (
    <View style={styles.flex}>
      <ModuleHeader eyebrow="ÖLÇÜ & ÇİZİM" title="Tasarım Stüdyosu" />
      <View style={styles.canvasWrap}>
        <DrawingPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  canvasWrap: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgPanel,
  },
});
