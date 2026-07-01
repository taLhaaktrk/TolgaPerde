import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, gradients } from '../../theme/colors';

// Telefon için yatay alt navigasyon. Tasarım sekmesi yalnız tablette görünür (burada gizli).
const ITEMS = [
  { id: MODULE_HOME, label: 'Ana Sayfa', hideForEmployee: true },
  { id: MODULE_CUSTOMERS, label: 'Müşteriler' },
  { id: MODULE_REPORTS, label: 'Raporlar', hideForEmployee: true },
  { id: MODULE_DESIGN, label: 'Tasarım', requiresDraw: true, hideForEmployee: true },
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
    <LinearGradient
      colors={gradients.sidebar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bar}
    >
      {items.map((item) => {
        const active = activeModule === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tab}
            onPress={() => setActiveModule(item.id)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.activeAccent} />}
            <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.tab} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={[styles.tabTxt, styles.logoutTxt]}>Çıkış</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAccent: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  tabTxt: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  tabTxtActive: { color: colors.textPrimary, fontWeight: '800' },
  logoutTxt: { color: colors.danger },
});
