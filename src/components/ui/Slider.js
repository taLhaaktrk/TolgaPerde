import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { colors, radii } from '../../theme/colors';

// Basit yatay slider — min...max arası tek değer. Cross-platform (web + native).
// value: number, onChange: (n) => void, min/max/step
export default function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatLabel,
  disabled,
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  widthRef.current = width;

  const clamp = (n) => Math.max(min, Math.min(max, n));
  const snap = (n) => Math.round(n / step) * step;

  const setFromX = (x) => {
    const w = widthRef.current;
    if (!w) return;
    const pct = Math.max(0, Math.min(1, x / w));
    const raw = min + pct * (max - min);
    onChange(clamp(snap(raw)));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e, g) => {
        const x = (g.x0 - (g.x0 - g.moveX)) + g.dx;
        setFromX(x);
      },
    })
  ).current;

  const pct = max === min ? 0 : ((clamp(value) - min) / (max - min)) * 100;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
        <View style={[styles.thumb, { left: `${pct}%` }]} />
      </View>
      <Text style={styles.value}>
        {typeof formatLabel === 'function' ? formatLabel(value) : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  track: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 14,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.primaryDeep,
    marginLeft: -12, // ortalama
  },
  value: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 14,
    minWidth: 70,
    textAlign: 'right',
  },
});
