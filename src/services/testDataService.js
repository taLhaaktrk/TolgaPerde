// Test müşterileri — geliştirme ve senaryo test'i için.
// Ayarlar > Test bölümünden tetiklenir.
// createTestCustomers(): 6 test müşterisi ekler (TEST1..TEST6)
// deleteTestCustomers(): fullName'i "TEST" ile başlayan tüm kayıtları siler

import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const daysAgoTs = (n) => Timestamp.fromDate(new Date(Date.now() - n * 86400000));
const daysAheadTs = (n) => Timestamp.fromDate(new Date(Date.now() + n * 86400000));
const dateTs = (iso) => Timestamp.fromDate(new Date(iso));

// Benzersiz installment id
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const TEST_PHONE = '05511009340';

// 6 test müşterisi — tüm senaryolar için
export async function createTestCustomers() {
  const specs = [
    // ─── TEST1 — YENİ müşteri, 15 gün geciken tek taksit (Senaryo 1, kademe 1: kibar) ───
    {
      fullName: 'TEST1 — Yeni 15gun (kibar ton)',
      phone: TEST_PHONE,
      totalAmount: 12000,
      deposit: 3000,
      remainingAmount: 9000,
      notes: 'Test müşterisi',
      source: 'manual',
      plannedInstallments: 3,
      orderDate: daysAgoTs(20),
      createdAt: daysAgoTs(1),   // BUGÜN → YENİ
      installmentPlan: [
        { id: uid(), vadesi: daysAgoTs(15), tutar: 3000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(15), tutar: 3000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(45), tutar: 3000, odendiMi: false },
      ],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },

    // ─── TEST2 — YENİ müşteri, 40 gün geciken (Senaryo 1, kademe 2: saygılı ton) ───
    {
      fullName: 'TEST2 — Yeni 40gun (saygili ton)',
      phone: TEST_PHONE,
      totalAmount: 15000,
      deposit: 3000,
      remainingAmount: 12000,
      notes: 'Test müşterisi',
      source: 'manual',
      plannedInstallments: 4,
      orderDate: daysAgoTs(50),
      createdAt: daysAgoTs(2),   // BUGÜN → YENİ
      installmentPlan: [
        { id: uid(), vadesi: daysAgoTs(40), tutar: 3000, odendiMi: false },
        { id: uid(), vadesi: daysAgoTs(10), tutar: 3000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(20), tutar: 3000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(50), tutar: 3000, odendiMi: false },
      ],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },

    // ─── TEST3 — YENİ müşteri, 80 gün geciken (Senaryo 1, kademe 3: ciddi ton) ───
    {
      fullName: 'TEST3 — Yeni 80gun (ciddi ton)',
      phone: TEST_PHONE,
      totalAmount: 20000,
      deposit: 4000,
      remainingAmount: 16000,
      notes: 'Test müşterisi',
      source: 'manual',
      plannedInstallments: 4,
      orderDate: daysAgoTs(100),
      createdAt: daysAgoTs(2),   // BUGÜN → YENİ (orderDate eski ama createdAt yeni)
      installmentPlan: [
        { id: uid(), vadesi: daysAgoTs(80), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAgoTs(50), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAgoTs(20), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(10), tutar: 4000, odendiMi: false },
      ],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },

    // ─── TEST4 — ESKİ müşteri + plan içi geciken (Senaryo 2) ───
    {
      fullName: 'TEST4 — Eski plan ici (Senaryo 2)',
      phone: TEST_PHONE,
      totalAmount: 25000,
      deposit: 5000,
      remainingAmount: 20000,
      notes: 'Test müşterisi',
      source: 'manual',
      plannedInstallments: 5,
      orderDate: dateTs('2026-06-15'),
      createdAt: dateTs('2026-06-15'),  // ESKİ (2026-07-01 öncesi)
      installmentPlan: [
        { id: uid(), vadesi: daysAgoTs(60), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAgoTs(30), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(1), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(30), tutar: 4000, odendiMi: false },
        { id: uid(), vadesi: daysAheadTs(60), tutar: 4000, odendiMi: false },
      ],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },

    // ─── TEST5 — ESKİ müşteri + plan süresi aşıldı (Senaryo 3, sadece süre) ───
    {
      fullName: 'TEST5 — Eski plan asildi (Senaryo 3)',
      phone: TEST_PHONE,
      totalAmount: 15000,
      deposit: 5000,
      remainingAmount: 10000,
      notes: 'Test müşterisi',
      source: 'manual',
      plannedInstallments: 2,
      orderDate: dateTs('2026-03-01'),
      createdAt: dateTs('2026-03-01'),  // ESKİ
      installmentPlan: [
        // Son taksitin vadesi bugünden ÖNCEDE → plan aşılmış
        { id: uid(), vadesi: daysAgoTs(120), tutar: 5000, odendiMi: false },
        { id: uid(), vadesi: daysAgoTs(90), tutar: 5000, odendiMi: false },
      ],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },

    // ─── TEST6 — ESKİ müşteri + plan YOK (Senaryo 3, sadece süre) ───
    {
      fullName: 'TEST6 — Eski plan yok (Senaryo 3)',
      phone: TEST_PHONE,
      totalAmount: 8000,
      deposit: 2000,
      remainingAmount: 6000,
      notes: 'Test müşterisi (taksit planı yok)',
      source: 'manual',
      plannedInstallments: 0,
      orderDate: dateTs('2026-02-01'),
      createdAt: dateTs('2026-02-01'),  // ESKİ
      installmentPlan: [],
      paymentHistory: [],
      measurementPhotos: [],
      measurementPhotoPaths: [],
    },
  ];

  for (const s of specs) {
    await addDoc(collection(db, 'customers'), s);
  }
  return { created: specs.length };
}

// fullName "TEST" ile başlayan tüm kayıtları sil (test müşterisi temizleme)
export async function deleteTestCustomers() {
  const snap = await getDocs(collection(db, 'customers'));
  const targets = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    if (typeof data.fullName === 'string' && data.fullName.startsWith('TEST')) {
      targets.push(d.ref);
    }
  });
  for (const ref of targets) {
    await deleteDoc(ref);
  }
  return { deleted: targets.length };
}
