// PWA otomatik güncelleme algılayıcısı.
// Build sırasında inject-pwa.js şunları ekler:
//   - window.__APP_VERSION__ = "20260817-152430"   (index.html <script>)
//   - /version.json                                 (aynı içerik, no-store)
//
// Bu hook belirli aralıklarla + tab görünür olduğunda /version.json'ı fetch eder;
// sürüm bundled sürümden farklıysa updateAvailable=true olur.
// UI bunu bir banner ile gösterip kullanıcıya "Yenile" imkanı sunar.

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 dk
const VERSION_URL = '/version.json';

// Bundled sürüm — inject-pwa.js tarafından gömülüyor.
// Yerel (expo start) çalışırken __APP_VERSION__ boş olur → hook kapalı çalışır.
function getBundledVersion() {
  if (typeof window === 'undefined') return null;
  return window.__APP_VERSION__ || null;
}

async function fetchLatestVersion() {
  try {
    // Cache-buster query — bazı proxy'ler no-store'a rağmen cache tutabiliyor
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.version || null;
  } catch (_) {
    return null;
  }
}

export default function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const bundledRef = useRef(getBundledVersion());

  useEffect(() => {
    // Sadece web platformunda çalış (Electron renderer da web sayılır ama zaten
    // orada auto-updater ayrı — bundled version yoksa hook kendi kapanıyor).
    if (Platform.OS !== 'web') return;
    if (!bundledRef.current) return; // dev / expo start durumu — kontrol yapma

    let cancelled = false;

    const check = async () => {
      const latest = await fetchLatestVersion();
      if (cancelled || !latest) return;
      if (latest !== bundledRef.current) {
        setUpdateAvailable(true);
      }
    };

    // Açılışta hemen kontrol
    check();

    // Periyodik kontrol
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    // Tab görünür / focus olunca kontrol (PWA ana ekrandan geri döndüğünde tetiklenir)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const reload = () => {
    if (typeof window === 'undefined') return;
    // Service worker varsa da unregister et (ileride ekleyebiliriz)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    }
    // Hard reload
    window.location.reload();
  };

  return { updateAvailable, reload };
}
