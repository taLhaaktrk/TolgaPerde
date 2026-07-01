// TolgaPerde — Taksit (installment) plan üreticisi.
// Yeni müşteri eklendiğinde plannedInstallments sayısına göre dinamik
// taksit dizisi üretir. Sabit aylık aralık, ilk taksit sipariş tarihi + 1 ay.

import { Timestamp } from 'firebase/firestore';

// JS Date'e N ay ekle. 31 Ocak + 1 ay → 28/29 Şubat'a çek (gün taşmasın).
export function addMonths(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfMonth));
  return d;
}

// Toplam borcu eşit parçalara böl; yuvarlama farkı son taksite gider.
function splitAmount(total, count) {
  if (count <= 0) return [];
  const base = Math.floor((total / count) * 100) / 100;
  const parts = new Array(count).fill(base);
  const last = Math.round((total - base * (count - 1)) * 100) / 100;
  parts[count - 1] = last;
  return parts;
}

/**
 * Yeni müşteri için taksit planı üret.
 * @returns {Array<{id:string, vadesi:Timestamp, tutar:number, odendiMi:boolean}>}
 */
export function buildInstallments({ orderDate, plannedCount, totalDebt }) {
  const count = Math.max(0, parseInt(plannedCount, 10) || 0);
  const total = Number(totalDebt) || 0;
  if (count === 0 || total <= 0) return [];

  const amounts = splitAmount(total, count);
  const base = orderDate instanceof Date ? orderDate : new Date(orderDate);

  return Array.from({ length: count }, (_, i) => ({
    id: `inst_${i}`,
    vadesi: Timestamp.fromDate(addMonths(base, i + 1)),
    tutar: amounts[i],
    odendiMi: false,
  }));
}

// Bir taksitin durumunu hesapla — ADIM 4'te listede kullanılacak.
// windowDays: kaç gün öncesinden "yaklaşıyor" sayılsın (default 3).
export function getInstallmentStatus(installment, windowDays = 3) {
  if (!installment || installment.odendiMi) return 'paid';
  const due = installment.vadesi?.toDate?.()
    || (installment.vadesi instanceof Date ? installment.vadesi : null);
  if (!due) return 'unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((dueDay - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';        // vadesi geçti
  if (diffDays <= windowDays) return 'upcoming'; // bugün veya 1-2 gün içinde
  return 'future';                            // ileri tarihli
}
