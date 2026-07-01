import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);
const STORAGE_KEY = '@tolgaperde_auth_v2';

export const ROLE_ADMIN = 'admin';
export const ROLE_USER = 'user';
export const ROLE_EMPLOYEE = 'employee'; // Sadece müşteri ekranı — ekle/sil/öde

// Hareketsizlik süresi — bu süre boyunca login etkinliği güncellenmezse oto-logout.
const INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 saat

// Statik (hardcoded) giriş bilgileri — şimdilik Firebase Auth yok.
const CREDENTIALS = [
  { username: 'talha', password: '12345', role: ROLE_ADMIN, displayName: 'Talha · Admin' },
  { username: 'tolgaperde', password: '0000', role: ROLE_USER, displayName: 'Tolga Perde' },
  { username: 'eleman', password: '6464', role: ROLE_EMPLOYEE, displayName: 'Eleman' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // Açılışta kayıtlı oturumu oku.
  // Mantık: oturum AsyncStorage'da, ama "lastActiveAt" timestamp'i de yazıyoruz.
  // - lastActiveAt YOK → bilgisayar yeni açıldı (RAM uçtu) → giriş gerek
  // - lastActiveAt VAR ama 12 saatten eski → otomatik logout
  // - lastActiveAt VAR ve taze → giriş yapmadan içeri
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.lastActiveAt) return;
          const idle = Date.now() - parsed.lastActiveAt;
          if (idle > INACTIVITY_MS) {
            AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
            return;
          }
          setUser({
            username: parsed.username,
            role: parsed.role,
            displayName: parsed.displayName,
          });
        } catch (e) { /* kötü kayıt — yoksay */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aktivite olduğunda lastActiveAt'i güncelle + 12 saatlik logout sayacı sıfırla.
  const bumpActivity = (currentUser) => {
    if (!currentUser) return;
    const payload = { ...currentUser, lastActiveAt: Date.now() };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setUser(null);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }, INACTIVITY_MS);
  };

  // Kullanıcı state'i değiştikçe sayacı yenile.
  useEffect(() => {
    if (user) bumpActivity(user);
    else if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // App görünür/odakta her olduğunda timestamp tazele (tab değişimi vs).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'visible' && user) bumpActivity(user);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user]);

  // NOT: beforeunload handler KALDIRILDI. Sebep: tarayıcı/Electron API'sinde
  // "pencere X kapatma" ile "bilgisayar shutdown" ayırt edilemez. İkisini de
  // tetiklediği için X'e basınca da logout oluyordu — istenmedi.
  //
  // Yerine: Açılışta yukarıdaki useEffect lastActiveAt'i kontrol ediyor.
  //   - X kapat + 30 dk sonra aç → idle < 2 saat → giriş gerekmez ✓
  //   - Shutdown + ertesi sabah aç → idle > 2 saat → otomatik logout ✓
  //   - App açık + 2 saat hareketsiz → timer ateşler → logout ✓

  const login = async (username, password) => {
    const u = (username || '').trim().toLowerCase();
    const match = CREDENTIALS.find((c) => c.username === u && c.password === password);
    if (!match) {
      return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
    }
    const session = {
      username: match.username,
      role: match.role,
      displayName: match.displayName,
    };
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...session, lastActiveAt: Date.now() })
      );
    } catch (e) {
      console.warn('Auth: oturum kaydedilemedi', e);
    }
    setUser(session);
    return { ok: true };
  };

  const logout = async () => {
    setUser(null);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  };

  // Manuel "kullanıcı bir şey yaptı" sinyali — gerekirse component'lerden çağrılabilir.
  const touchActivity = () => { if (user) bumpActivity(user); };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        touchActivity,
        isAdmin: user?.role === ROLE_ADMIN,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
