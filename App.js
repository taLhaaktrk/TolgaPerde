import 'react-native-gesture-handler';
import React from 'react';
import { View, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CustomerProvider } from './src/context/CustomerContext';
import { AppShellProvider } from './src/context/AppShellContext';
import { AuthProvider, useAuth, ROLE_ADMIN } from './src/context/AuthContext';
import MainShell from './src/screens/MainShell';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import AlertHost from './src/components/ui/AlertHost';
import UpdateBanner from './src/components/ui/UpdateBanner';
import './src/theme/webStyles'; // web/Electron: global CSS (scrollbar, focus, selection)
import { colors } from './src/theme/colors';

// Reanimated 4'ün inline-style heuristic uyarısı false-positive — susturuyoruz.
LogBox.ignoreLogs([
  /shared value's \.value inside reanimated inline style/i,
]);

// Auth durumuna göre kök yönlendirme.
function RootRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    // Oturum okunuyor — kısa boş ekran (flash login'i önler)
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  if (!user) {
    return <LoginScreen />;
  }
  if (user.role === ROLE_ADMIN) {
    return <AdminDashboard />;
  }
  return <MainShell />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <CustomerProvider>
            <AppShellProvider>
              <RootRouter />
              <AlertHost />
              <UpdateBanner />
            </AppShellProvider>
          </CustomerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
