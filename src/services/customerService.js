import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../config/firebaseConfig';
import { buildInstallments } from '../utils/installments';

export const SOURCE_MANUAL = 'manual';
export const SOURCE_CANVAS = 'canvas';
export const SOURCE_PHOTO = 'photo_archive';

export const PAYMENT_CASH = 'cash';
export const PAYMENT_CARD = 'card';

export const paymentMethodLabel = (m) =>
  m === PAYMENT_CARD ? 'Kart' : 'Nakit';

// Tek doğruluk noktası: tüm yazımlar bu fonksiyondan geçer, şema her zaman aynı.
function buildDocPayload({ customer, source, mediaUrl, extras }) {
  return {
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    totalAmount: customer.totalAmount || 0,
    deposit: customer.deposit || 0,
    remainingAmount: customer.remainingAmount || 0,
    source,
    mediaUrl: mediaUrl || null,
    notes: customer.notes || '',
    // Yeni müşteride planlanan taksit sayısı (sadece not amaçlı, hesaba katılmaz).
    plannedInstallments: customer.plannedInstallments || 0,
    // Sipariş tarihi — kullanıcı belirler (geçmişe dönük olabilir). Yoksa şu an.
    orderDate: customer.orderDate
      ? Timestamp.fromDate(new Date(customer.orderDate))
      : Timestamp.now(),
    createdAt: serverTimestamp(),
    ...(extras || {}),
  };
}

export async function saveManual(customer) {
  const ref = await addDoc(
    collection(db, 'customers'),
    buildDocPayload({ customer, source: SOURCE_MANUAL, mediaUrl: null })
  );
  return ref.id;
}

// Bir resim referansını (uri/file) Storage'a yüklenebilir Blob'a çevir.
// Web'de File objesi varsa direkt onu kullanır (en güvenilir).
// Aksi halde URI'yi fetch'ler ve içerik gerçekten geldiğinden emin olur.
async function toUploadBlob(photo) {
  // 1) Web: File objesi varsa direkt al — boyut garantili
  if (photo.file && photo.file.size > 0) {
    return { blob: photo.file, contentType: photo.file.type || 'image/jpeg' };
  }
  // 2) URI'den fetch et
  const res = await fetch(photo.uri);
  if (!res.ok) throw new Error(`Görsel okunamadı (HTTP ${res.status})`);
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Görsel boş ya da bozuk — tekrar seçip dene.');
  }
  return { blob, contentType: blob.type || photo.mimeType || 'image/jpeg' };
}

// Birden çok ölçü/defter fotoğrafını Storage'a yükler.
// Geri dönüş: [{ url, path }, ...] — silme/temizlik için path de lazım.
export async function uploadMeasurementPhotos(photos, customerName) {
  if (!photos || photos.length === 0) return [];
  const safeName = (customerName || 'unnamed').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const result = [];
  for (let i = 0; i < photos.length; i++) {
    const { blob, contentType } = await toUploadBlob(photos[i]);
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const path = `customers/${safeName}/measurement_${Date.now()}_${i}.${ext}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, blob, { contentType });
    const url = await getDownloadURL(fileRef);
    result.push({ url, path });
  }
  return result;
}

// Form taksit satırlarını ({ date, amount, method? }) Firestore formatına çevir.
// at: Timestamp (serverTimestamp dizi içinde çalışmaz).
function normalizeInstallments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((it) => Number(it.amount) > 0)
    .map((it) => ({
      amount: Number(it.amount) || 0,
      method: it.method || PAYMENT_CASH,
      at: it.date ? Timestamp.fromDate(new Date(it.date)) : Timestamp.now(),
    }));
}

// paymentHistory dizisinden en güncel ödeme bilgisini çıkar.
// Arşiv müşteri kaydında lastPaymentAt'i set etmek için kullanılır.
function latestPaymentInfo(paymentHistory) {
  if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) {
    return { lastPaymentAt: null, lastPaymentMethod: null };
  }
  let maxEntry = null;
  let maxMs = 0;
  for (const p of paymentHistory) {
    const ms = p.at?.toMillis?.() || 0;
    if (ms > maxMs) {
      maxMs = ms;
      maxEntry = p;
    }
  }
  return {
    lastPaymentAt: maxEntry?.at || null,
    lastPaymentMethod: maxEntry?.method || null,
  };
}

// Yeni müşteriyi ölçü fotoğrafları + taksitlerle beraber kaydet.
export async function saveCustomerWithPhotos({ customer, photos }) {
  const uploadResult = await uploadMeasurementPhotos(photos, customer.fullName);
  const photoUrls = uploadResult.map((r) => r.url);
  const photoPaths = uploadResult.map((r) => r.path);
  const paymentHistory = normalizeInstallments(customer.installments);
  // Arşivde taksit ödendiyse "Son Ödeme" bilgisi paymentHistory'nin max'ından gelir.
  const { lastPaymentAt, lastPaymentMethod } = latestPaymentInfo(paymentHistory);

  // Yeni müşteri (mode === 'new'): planlanan taksit sayısı varsa dinamik taksit
  // planı üret. Arşivde (paymentHistory dolu) plan yok — geçmiş kayıt zaten geldi.
  const plannedCount = parseInt(customer.plannedInstallments, 10) || 0;
  const installmentPlan = (plannedCount > 0 && paymentHistory.length === 0)
    ? buildInstallments({
        orderDate: customer.orderDate ? new Date(customer.orderDate) : new Date(),
        plannedCount,
        totalDebt: customer.remainingAmount || 0,
      })
    : [];

  const payload = buildDocPayload({
    customer,
    source: SOURCE_MANUAL,
    mediaUrl: null,
    extras: {
      measurementPhotos: photoUrls,
      measurementPhotoPaths: photoPaths,
      paymentHistory,
      installmentPlan,
      ...(lastPaymentAt
        ? { lastPaymentAt, lastPaymentMethod }
        : {}),
    },
  });
  const ref = await addDoc(collection(db, 'customers'), payload);

  const customerDoc = {
    id: ref.id,
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    totalAmount: customer.totalAmount || 0,
    deposit: customer.deposit || 0,
    remainingAmount: customer.remainingAmount || 0,
    source: SOURCE_MANUAL,
    mediaUrl: null,
    measurementPhotos: photoUrls,
    measurementPhotoPaths: photoPaths,
    notes: customer.notes || '',
    plannedInstallments: customer.plannedInstallments || 0,
    orderDate: customer.orderDate
      ? Timestamp.fromDate(new Date(customer.orderDate))
      : Timestamp.now(),
    createdAt: Timestamp.now(),
    paymentHistory,
    installmentPlan,
    ...(lastPaymentAt ? { lastPaymentAt, lastPaymentMethod } : {}),
  };

  return { id: ref.id, photoUrls, customerDoc };
}

// Var olan müşteriyi düzenle.
// photos: [{ uri, remote?, path? }, ...] — remote=true olanlar zaten Storage'da, yenileri yüklenir.
export async function updateCustomerWithPhotos({ customerId, customer, photos }) {
  if (!customerId) throw new Error('Müşteri ID gerekli');

  const localPhotos = photos.filter((p) => !p.remote);
  const remotePhotos = photos.filter((p) => p.remote);

  // Yeni eklenenleri yükle
  const uploadResult = await uploadMeasurementPhotos(localPhotos, customer.fullName);

  const finalUrls = [
    ...remotePhotos.map((p) => p.uri),
    ...uploadResult.map((r) => r.url),
  ];
  const finalPaths = [
    ...remotePhotos.map((p) => p.path).filter(Boolean),
    ...uploadResult.map((r) => r.path),
  ];

  const paymentHistory = normalizeInstallments(customer.installments);
  const { lastPaymentAt: newLastAt, lastPaymentMethod: newLastMethod } = latestPaymentInfo(paymentHistory);

  // Mevcut doc'tan installmentPlan'i oku — düzenleme mevcut planı bozmasın.
  // (Plan sadece yeni müşteri eklenirken üretilir; düzenleme korur.)
  const ref = doc(db, 'customers', customerId);
  const existingSnap = await getDoc(ref);
  const existingData = existingSnap.exists() ? existingSnap.data() : {};
  const installmentPlan = Array.isArray(existingData.installmentPlan)
    ? existingData.installmentPlan
    : null;

  const updatePayload = {
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    totalAmount: customer.totalAmount || 0,
    deposit: customer.deposit || 0,
    remainingAmount: customer.remainingAmount || 0,
    notes: customer.notes || '',
    plannedInstallments: customer.plannedInstallments || 0,
    orderDate: customer.orderDate
      ? Timestamp.fromDate(new Date(customer.orderDate))
      : Timestamp.now(),
    measurementPhotos: finalUrls,
    measurementPhotoPaths: finalPaths,
    paymentHistory,
    updatedAt: serverTimestamp(),
  };
  if (installmentPlan) updatePayload.installmentPlan = installmentPlan;
  // paymentHistory'den türetilen lastPaymentAt — düzenlemede de güncelle
  if (newLastAt) {
    updatePayload.lastPaymentAt = newLastAt;
    updatePayload.lastPaymentMethod = newLastMethod;
  }
  await updateDoc(ref, updatePayload);

  // Lokal state güncellemesi için doc objesini geri dön
  return {
    id: customerId,
    customerDoc: {
      ...customer,
      id: customerId,
      measurementPhotos: finalUrls,
      measurementPhotoPaths: finalPaths,
      paymentHistory,
      ...(installmentPlan ? { installmentPlan } : {}),
    },
  };
}

// Müşteriyi tamamen sil — doc + Storage'daki tüm görselleri.
export async function deleteCustomer(customerId) {
  if (!customerId) throw new Error('Müşteri ID gerekli');
  const ref = doc(db, 'customers', customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await deleteDoc(ref);
    return;
  }

  const data = snap.data();
  const pathsToDelete = [];
  if (data.mediaPath) pathsToDelete.push(data.mediaPath);
  if (Array.isArray(data.measurementPhotoPaths)) {
    pathsToDelete.push(...data.measurementPhotoPaths);
  }

  // Storage'ı best-effort temizle — başarısız olursa devam et.
  for (const p of pathsToDelete) {
    try {
      await deleteObject(storageRef(storage, p));
    } catch (e) {
      console.warn('Storage silinemedi:', p, e.message);
    }
  }

  await deleteDoc(ref);
}

// Yerel dosyayı (canvas snapshot veya kamera çıktısı) Storage'a yükler, indirme linkini döner.
export async function uploadMedia(localUri, storagePath, contentType = 'image/png') {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileRef = storageRef(storage, storagePath);
  await uploadBytes(fileRef, blob, { contentType });
  const url = await getDownloadURL(fileRef);
  return { url, path: storagePath };
}

// Aktif bir müşterinin var olan kaydına ödeme uygula.
// Ödeme türü (cash/card) ve tutar paymentHistory dizisine eklenir.
// Negatif kalan oluşmasın diye 0'da clamp eder.
export async function recordPayment(customerId, amount, method = PAYMENT_CASH, note = '') {
  if (!customerId) throw new Error('Müşteri ID gerekli');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Geçersiz ödeme tutarı');

  const ref = doc(db, 'customers', customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Müşteri bulunamadı');

  const data = snap.data();
  // Peşinat (deposit) sipariş günü alınan; sonradan ödemeler TAKSİT olarak ayrı tutulur.
  // recordPayment artık SADECE remainingAmount'u düşürür + paymentHistory'ye ekler.
  const newRemaining = Math.max((data.remainingAmount || 0) - amount, 0);

  // arrayUnion + Timestamp.now() — serverTimestamp dizi içinde çalışmıyor.
  const paymentEntry = {
    amount,
    method,
    at: Timestamp.now(),
    ...(note ? { note } : {}),
  };

  const updatePayload = {
    remainingAmount: newRemaining,
    lastPaymentAt: serverTimestamp(),
    lastPaymentMethod: method,
    paymentHistory: arrayUnion(paymentEntry),
  };

  // installmentPlan senkronizasyonu — varsa sıradaki ödenmemiş taksit(ler)i işaretle.
  // Mantık: planTotal − newRemaining = bugüne kadar plan kapsamında ödenmiş toplam.
  // O toplama ulaşıncaya kadar sırayla taksitleri 'odendiMi: true' işaretle.
  const plan = Array.isArray(data.installmentPlan) ? [...data.installmentPlan] : [];
  if (plan.length > 0) {
    const planTotal = plan.reduce((s, p) => s + (p.tutar || 0), 0);
    const previouslyPaid = plan
      .filter((p) => p.odendiMi)
      .reduce((s, p) => s + (p.tutar || 0), 0);
    let needToMark = (planTotal - newRemaining) - previouslyPaid;
    let changed = false;
    for (let i = 0; i < plan.length; i++) {
      if (plan[i].odendiMi) continue;
      // 1 kuruş tolerans yuvarlama farkları için
      if (needToMark + 0.01 >= (plan[i].tutar || 0)) {
        plan[i] = { ...plan[i], odendiMi: true, odemeTarihi: Timestamp.now() };
        needToMark -= plan[i].tutar || 0;
        changed = true;
      }
    }
    if (changed) updatePayload.installmentPlan = plan;
  }

  await updateDoc(ref, updatePayload);

  return {
    newRemaining,
    paidAmount: amount,
    method,
    paymentEntry,
  };
}

// VAR OLAN bir müşteri dokümanına canvas/foto görselini ekle/güncelle.
// Yeni doc OLUŞTURMAZ — sadece mediaUrl/mediaPath alanlarını günceller.
// Kullanım: aktif müşteri seçiliyken canvas kaydedildiğinde.
export async function updateCustomerMedia(customerId, localUri, contentType = 'image/png', source = SOURCE_CANVAS) {
  if (!customerId) throw new Error('Müşteri ID gerekli');
  const ref = doc(db, 'customers', customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Müşteri bulunamadı');

  const data = snap.data();
  const safeName = (data.fullName || 'unnamed').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const folder = source === SOURCE_PHOTO ? 'archive' : 'canvas';
  const path = `customers/${safeName}/${folder}_${Date.now()}.${ext}`;

  const { url } = await uploadMedia(localUri, path, contentType);

  await updateDoc(ref, {
    mediaUrl: url,
    mediaPath: path,
    source, // canvas eklendiyse source da güncellensin
    updatedAt: serverTimestamp(),
  });

  return { url, path };
}

// 🔔 Yaklaşan Taksitler listesinden tek bir taksitin hatırlatmasını kalıcı kapat.
// Customer doc'una dismissedInstallmentIds dizisine taksit id'sini ekler.
// Müşteri/taksit silinmiyor — sadece hatırlatma listesinden çıkar.
export async function dismissInstallmentReminder(customerId, installmentId) {
  if (!customerId || !installmentId) throw new Error('ID gerekli');
  const ref = doc(db, 'customers', customerId);
  await updateDoc(ref, {
    dismissedInstallmentIds: arrayUnion(installmentId),
    updatedAt: serverTimestamp(),
  });
}

// "Uzun süre iletişime geçilmeyen" listesinden bir müşteriyi kalıcı kapat.
// attentionDismissed: true olur, filtre bunu hariç tutar.
export async function dismissAttentionReminder(customerId) {
  if (!customerId) throw new Error('Müşteri ID gerekli');
  const ref = doc(db, 'customers', customerId);
  await updateDoc(ref, {
    attentionDismissed: true,
    attentionDismissedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveWithMedia({ customer, source, localUri, contentType, extras }) {
  const safeName = (customer.fullName || 'unnamed').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const folder = source === SOURCE_PHOTO ? 'archive' : 'canvas';
  const path = `customers/${safeName}/${folder}_${Date.now()}.${ext}`;

  const { url } = await uploadMedia(localUri, path, contentType);

  const ref = await addDoc(
    collection(db, 'customers'),
    buildDocPayload({
      customer,
      source,
      mediaUrl: url,
      extras: { mediaPath: path, ...(extras || {}) },
    })
  );
  return { id: ref.id, mediaUrl: url, mediaPath: path };
}
