import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Canlı abonelik — offline persistence açık olduğu için internet yokken bile cache'ten besler.
export default function useCustomers(max = 500) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'customers'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log(`[useCustomers] ${snap.docs.length} müşteri yüklendi (cache:${snap.metadata.fromCache})`);
        setCustomers(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLoading(false);
      },
      (err) => {
        // Permission denied = Rules sorunu. Network = internet yok.
        console.error('[useCustomers] HATA:', err.code, err.message);
        if (err.code === 'permission-denied') {
          console.error('  → Firestore Rules kapalı. Console > Firestore > Rules açık olmalı.');
        }
        setLoading(false);
      }
    );
    return unsub;
  }, [max]);

  return { customers, loading };
}
