import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii } from '../../theme/colors';

export default function RailButton({ label, active, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.wrap}>
      {active && (
        <>
          <LinearGradient
            colors={gradients.activeRail}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeBg}
          />
          <View style={styles.activeAccent} />
        </>
      )}
      <View style={styles.inner}>
        <Text
          style={[styles.label, active && styles.labelActive]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  inner: {
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  labelActive: { color: colors.textPrimary, fontWeight: '800' },
  activeBg: { ...StyleSheet.absoluteFillObject },
  activeAccent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
});
