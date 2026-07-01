import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Sidebar from '../components/shell/Sidebar';
import BottomNav from '../components/shell/BottomNav';
import CustomerColumn from '../components/shell/CustomerColumn';
import HomeModule from '../modules/HomeModule';
import CustomersModule from '../modules/CustomersModule';
import ReportsModule from '../modules/ReportsModule';
import DesignModule from '../modules/DesignModule';
import PhotoModule from '../modules/PhotoModule';
import {
  useAppShell,
  MODULE_HOME,
  MODULE_CUSTOMERS,
  MODULE_REPORTS,
  MODULE_DESIGN,
  MODULE_PHOTO,
} from '../context/AppShellContext';
import useDeviceType from '../hooks/useDeviceType';
import { useAuth, ROLE_EMPLOYEE } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Orta kolon (CustomerColumn) sadece bu modüllerde görünür.
const MODULES_WITH_CUSTOMER_COLUMN = new Set([MODULE_HOME, MODULE_CUSTOMERS]);

function renderModule(moduleId, canDraw, isEmployee) {
  // Eleman: hangi modül seçilirse seçilsin, sadece Müşteriler render edilir.
  if (isEmployee) return <CustomersModule />;
  switch (moduleId) {
    case MODULE_CUSTOMERS:
      return <CustomersModule />;
    case MODULE_REPORTS:
      return <ReportsModule />;
    case MODULE_DESIGN:
      // Çizim yalnız tablette; başka cihaz buraya düşerse Ana Sayfa'ya çek.
      return canDraw ? <DesignModule /> : <HomeModule />;
    case MODULE_PHOTO:
      return <PhotoModule />;
    case MODULE_HOME:
    default:
      return <HomeModule />;
  }
}

// Telefonda swipe ile dolaşılabilen sekme sırası
const PHONE_SWIPE_TABS = [MODULE_HOME, MODULE_CUSTOMERS, MODULE_REPORTS];

export default function MainShell() {
  const {
    activeModule,
    activeCustomer,
    setActiveModule,
    clearActiveCustomer,
  } = useAppShell();
  const { isWide, isPhone, canDraw } = useDeviceType();
  const { user } = useAuth();
  const isEmployee = user?.role === ROLE_EMPLOYEE;

  // Eleman rolü açılışta veya manuel state değişiminde başka modülde kalırsa
  // otomatik olarak Müşteriler'e yönlendir.
  useEffect(() => {
    if (isEmployee && activeModule !== MODULE_CUSTOMERS) {
      setActiveModule(MODULE_CUSTOMERS);
    }
  }, [isEmployee, activeModule, setActiveModule]);

  // Sola swipe → sonraki sekme (eleman tab değiştiremez)
  const goNextTab = useCallback(() => {
    if (isEmployee) return;
    const idx = PHONE_SWIPE_TABS.indexOf(activeModule);
    if (idx >= 0 && idx < PHONE_SWIPE_TABS.length - 1) {
      setActiveModule(PHONE_SWIPE_TABS[idx + 1]);
    }
  }, [activeModule, setActiveModule, isEmployee]);

  // Sağa swipe → müşteri detayı açıksa kapat, değilse önceki sekme
  const goPrevOrCloseDetail = useCallback(() => {
    if (activeCustomer && MODULES_WITH_CUSTOMER_COLUMN.has(activeModule)) {
      clearActiveCustomer();
      return;
    }
    if (isEmployee) return; // eleman tab değiştiremez ama detay'dan çıkabilir (yukarıda)
    const idx = PHONE_SWIPE_TABS.indexOf(activeModule);
    if (idx > 0) {
      setActiveModule(PHONE_SWIPE_TABS[idx - 1]);
    }
  }, [activeModule, activeCustomer, clearActiveCustomer, setActiveModule, isEmployee]);

  // Yatay pan gesture — dikey scroll'lar serbest, yalnız net yatay hareket tetikler.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-30, 30])
    .onEnd((e) => {
      'worklet';
      if (Math.abs(e.translationY) > 80) return;
      if (e.translationX > 60) runOnJS(goPrevOrCloseDetail)();
      else if (e.translationX < -60) runOnJS(goNextTab)();
    });

  const moduleContent = (
    <Animated.View
      key={activeModule}
      entering={FadeIn.duration(260)}
      style={styles.moduleAnim}
    >
      {renderModule(activeModule, canDraw, isEmployee)}
    </Animated.View>
  );

  // GENİŞ (tablet / masaüstü): yan yana — rail | müşteri kolonu | içerik
  if (isWide) {
    const showCustomerCol = MODULES_WITH_CUSTOMER_COLUMN.has(activeModule);
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.row}>
          <Sidebar />
          {showCustomerCol && <CustomerColumn />}
          <View style={styles.contentPane}>
            <View style={styles.watermarkWrap} pointerEvents="none">
              <Text style={styles.watermarkTxt}>Tolga Tosun</Text>
            </View>
            {moduleContent}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // TELEFON: dikey istif — içerik üstte, alt navigasyon altta.
  // Müşteri seçiliyse master-detail mantığıyla detay tam ekran gelir (X ile listeye döner).
  const showDetailFull =
    !!activeCustomer && MODULES_WITH_CUSTOMER_COLUMN.has(activeModule);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.column}>
          <View style={styles.contentPane}>
            <View style={styles.watermarkWrap} pointerEvents="none">
              <Text style={[styles.watermarkTxt, isPhone && styles.watermarkTxtPhone]} numberOfLines={1}>
                Tolga Tosun
              </Text>
            </View>
            {showDetailFull ? <CustomerColumn fullWidth /> : moduleContent}
          </View>
          <BottomNav />
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  row: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, flexDirection: 'column' },
  contentPane: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  moduleAnim: { flex: 1 },
  // Watermark: ortada "Tolga Tosun" italik silüet yazı
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkTxt: {
    fontSize: 96,
    fontStyle: 'italic',
    fontWeight: '300',
    color: 'rgba(201, 169, 97, 0.08)', // altın tonu, çok saydam
    letterSpacing: 4,
    fontFamily: 'Georgia', // serif, italik için zarif
  },
  // Telefonda küçük ekran için kompakt — taşmadan ortalanır
  watermarkTxtPhone: {
    fontSize: 48,
    letterSpacing: 2,
  },
});
