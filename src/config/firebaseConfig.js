import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDQ__id7TmRUIYtzVAtVGWG-zsi0PuAHrk',
  authDomain: 'tolgaperde-project.firebaseapp.com',
  projectId: 'tolgaperde-project',
  storageBucket: 'tolgaperde-project.firebasestorage.app',
  messagingSenderId: '893882123977',
  appId: '1:893882123977:web:b66deeadfaae97cd436f18',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Web/PWA/Electron → IndexedDB kalıcı cache → ikinci açılışta veriler ANINDA
// gelir (önce cache'ten, sonra background'da server'dan senkron).
// Native (Expo Go iOS/Android) → IndexedDB yok, in-memory cache.
const hasIndexedDB =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.indexedDB !== 'undefined';

const localCache = hasIndexedDB
  ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  : memoryLocalCache();

const db = initializeFirestore(app, { localCache });
const storage = getStorage(app);

export { app, db, storage };
