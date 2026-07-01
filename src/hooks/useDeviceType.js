import { useWindowDimensions, Platform } from 'react-native';

export const DEVICE_PHONE = 'phone';
export const DEVICE_TABLET = 'tablet';
export const DEVICE_DESKTOP = 'desktop';

// Cihaz tipini canlı boyuta göre döner (rotation/resize'da otomatik günceller).
// - Web: genişlik eşiklerine göre desktop / tablet / phone
// - Native: en kısa kenar >= 600dp ise tablet (iPad), yoksa telefon
export default function useDeviceType() {
  const { width, height } = useWindowDimensions();

  let device;
  if (Platform.OS === 'web') {
    if (width >= 900) device = DEVICE_DESKTOP;
    else if (width >= 600) device = DEVICE_TABLET;
    else device = DEVICE_PHONE;
  } else {
    const shortest = Math.min(width, height);
    device = shortest >= 600 ? DEVICE_TABLET : DEVICE_PHONE;
  }

  return {
    device,
    width,
    height,
    isPhone: device === DEVICE_PHONE,
    isTablet: device === DEVICE_TABLET,
    isDesktop: device === DEVICE_DESKTOP,
    // Çizim sadece tablette. (Web/desktop'ta da gizli — istenirse ileride açılır.)
    canDraw: device === DEVICE_TABLET,
    // Geniş "yan yana panel" düzeni: tablet + masaüstü
    isWide: device === DEVICE_TABLET || device === DEVICE_DESKTOP,
  };
}
