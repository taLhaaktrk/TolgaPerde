import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RailButton from './RailButton';
import Alert from '../../utils/alert';
import LOGO from '../../theme/brand';
import {
  useAppShell,
  MODULE_HOME,
  MODULE_CUSTOMERS,
  MODULE_REPORTS,
  MODULE_DESIGN,
  MODULE_SETTINGS,
} from '../../context/AppShellContext';
import { useAuth, ROLE_EMPLOYEE } from '../../context/AuthContext';
import useDeviceType from '../../hooks/useDeviceType';
import { colors, gradients } from '../../theme/colors';

// NOT: Foto Arşivi / OCR kullanıcı tarafından gizlendi (kod Admin panelinde duruyor).
// requiresDraw: true olan sekme yalnızca çizim destekli cihazlarda (tablet) görünür.
const RAIL_ITEMS = [
  { id: MODULE_HOME, label: 'Ana Sayfa', hideForEmployee: true },
  { id: MODULE_CUSTOMERS, label: 'Müşteriler' },
  { id: MODULE_REPORTS, label: 'Raporlar', hideForEmployee: true },
  { id: MODULE_DESIGN, label: 'Tasarım', requiresDraw: true, hideForEmployee: true },
  { id: MODULE_SETTINGS, label: 'Ayarlar', hideForEmployee: true },
];

export default function Sidebar() {
  const { activeModule, setActiveModule } = useAppShell();
  const { logout, user } = useAuth();
  const { canDraw } = useDeviceType();
  const isEmployee = user?.role === ROLE_EMPLOYEE;

  const items = RAIL_ITEMS.filter(
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
      end={{ x: 0, y: 1 }}
      style={styles.rail}
    >
      <View style={styles.brand}>
        <Image source={LOGO} style={styles.brandLogo} resizeMode="contain" />
      </View>

      <View style={styles.divider} />

      <View style={styles.navList}>
        {items.map((item) => (
          <RailButton
            key={item.id}
            label={item.label}
            active={activeModule === item.id}
            onPress={() => setActiveModule(item.id)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <RailButton label="Ayarlar" active={false} onPress={() => {}} />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutTxt}>Çıkış</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 86,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brand: {
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  brandLogo: {
    width: 64,
    height: 64,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  navList: { flex: 1, paddingTop: 8 },
  footer: { paddingBottom: 12 },
  logoutBtn: {
    marginHorizontal: 8,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(226,92,92,0.4)',
  },
  logoutTxt: { color: colors.danger, fontWeight: '800', fontSize: 11 },
});

