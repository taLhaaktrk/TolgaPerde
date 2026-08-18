import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import Alert from '../../utils/alert';
import {
  useAppShell,
  MODULE_HOME,
  MODULE_CUSTOMERS,
  MODULE_REPORTS,
  MODULE_DESIGN,
} from '../../context/AppShellContext';
import { useAuth, ROLE_EMPLOYEE } from '../../context/AuthContext';
import useDeviceType from '../../hooks/useDeviceType';
import { colors } from '../../theme/colors';

// ─── SVG Icons (Feather-inspired, stroke-based) ─────────────────────
const ICON_SIZE = 26;
const STROKE_ACTIVE = 2.2;
const STROKE_INACTIVE = 1.7;

const IconHome = ({ color, strokeWidth }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="9 22 9 12 15 12 15 22"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const IconUsers = ({ color, strokeWidth }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChart = ({ color, strokeWidth }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="20" x2="18" y2="10"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="20" x2="12" y2="4"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="6" y1="20" x2="6" y2="14"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

const IconPencil = ({ color, strokeWidth }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M12 20h9"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLogout = ({ color, strokeWidth }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Line x1="21" y1="12" x2="9" y2="12"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Tab items ──────────────────────────────────────────────────────
const ITEMS = [
  { id: MODULE_HOME, Icon: IconHome, hideForEmployee: true },
  { id: MODULE_CUSTOMERS, Icon: IconUsers },
  { id: MODULE_REPORTS, Icon: IconChart, hideForEmployee: true },
  { id: MODULE_DESIGN, Icon: IconPencil, requiresDraw: true, hideForEmployee: true },
];

export default function BottomNav() {
  const { activeModule, setActiveModule } = useAppShell();
  const { logout, user } = useAuth();
  const { canDraw } = useDeviceType();
  const isEmployee = user?.role === ROLE_EMPLOYEE;

  const items = ITEMS.filter(
    (it) => (!it.requiresDraw || canDraw) && (!it.hideForEmployee || !isEmployee)
  );

  const handleLogout = () => {
    Alert.alert(
      'Oturumu Kapatmak İstiyor musunuz?',
      'Çıkış yaptıktan sonra tekrar giriş yapmanız gerekecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
      ],
      { tone: 'warning' }
    );
  };

  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const active = activeModule === item.id;
        const color = active ? colors.gold : colors.textMuted;
        const stroke = active ? STROKE_ACTIVE : STROKE_INACTIVE;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tab}
            onPress={() => setActiveModule(item.id)}
            activeOpacity={0.6}
          >
            <item.Icon color={color} strokeWidth={stroke} />
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.tab} onPress={handleLogout} activeOpacity={0.6}>
        <IconLogout color={colors.danger} strokeWidth={STROKE_INACTIVE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
