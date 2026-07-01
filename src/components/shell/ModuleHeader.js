import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing } from '../../theme/colors';

export default function ModuleHeader({ eyebrow, title, right }) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={gradients.moduleHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={styles.title}>{title}</Text>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      <View style={styles.goldLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  goldLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },
});
