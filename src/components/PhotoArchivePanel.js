import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Alert from '../utils/alert';
import { detectHandwriting } from '../services/ocrService';
import { isVisionConfigured } from '../config/visionConfig';
import { saveWithMedia, SOURCE_PHOTO } from '../services/customerService';
import { useCustomer } from '../context/CustomerContext';
import { useAppShell } from '../context/AppShellContext';

export default function PhotoArchivePanel({ onSaved }) {
  const customer = useCustomer();
  const { activeCustomer } = useAppShell();
  const [photoUri, setPhotoUri] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ocrResult, setOcrResult] = useState(null); // { guessedName, fullText }

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Kamera izni gerekli',
        'Eski defter fotoğrafını çekebilmek için iPad ayarlarından kamera iznini aç.'
      );
      return false;
    }
    return true;
  };

  const handleCapture = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
    setOcrResult(null);
  };

  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
    setOcrResult(null);
  };

  const runOcrOnly = async () => {
    if (!photoUri) return;
    if (!isVisionConfigured()) {
      Alert.alert(
        'Vision API anahtarı yok',
        "Lütfen src/config/visionConfig.js içine Cloud Vision API anahtarını ekle."
      );
      return;
    }
    setBusy(true);
    try {
      const r = await detectHandwriting(photoUri);
      setOcrResult({ guessedName: r.guessedName, fullText: r.fullText });
      if (r.guessedName) {
        customer.setFullName(r.guessedName);
      }
    } catch (e) {
      console.warn('OCR hatası:', e);
      Alert.alert('OCR başarısız', e.message || 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadAndSave = async () => {
    if (!photoUri) return;

    setBusy(true);
    try {
      // 1) OCR (anahtar yapılandırılmamışsa atla, ama yine yükleyelim).
      // Aktif müşteri varsa OCR sonucu formu doldurmasın — sadece tam metni kaydet.
      let detectedName = activeCustomer?.fullName || customer.fullName;
      let fullText = '';
      if (isVisionConfigured()) {
        try {
          const r = await detectHandwriting(photoUri);
          fullText = r.fullText;
          if (r.guessedName && !activeCustomer) {
            detectedName = r.guessedName;
            customer.setFullName(r.guessedName);
            setOcrResult({ guessedName: r.guessedName, fullText: r.fullText });
          } else {
            setOcrResult({ guessedName: r.guessedName || '', fullText: r.fullText });
          }
        } catch (e) {
          console.warn('Upload sırası OCR hatası:', e);
          // OCR başarısız olsa bile yüklemeye devam et.
        }
      }

      const dataForSave = activeCustomer
        ? {
            fullName: activeCustomer.fullName,
            phone: activeCustomer.phone,
            totalAmount: 0,
            deposit: 0,
            remainingAmount: 0,
          }
        : {
            ...customer.snapshot(),
            fullName: detectedName || 'İsimsiz',
          };

      // 2) Storage + Firestore unified write
      const { mediaUrl } = await saveWithMedia({
        customer: dataForSave,
        source: SOURCE_PHOTO,
        localUri: photoUri,
        contentType: 'image/jpeg',
        extras: fullText ? { ocrFullText: fullText } : null,
      });

      Alert.alert(
        'Arşivlendi',
        activeCustomer
          ? `${dataForSave.fullName} için yeni arşiv sayfası eklendi.`
          : `Algılanan isim: "${dataForSave.fullName}".\n${mediaUrl ? 'Görsel buluta yüklendi.' : ''}`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              setPhotoUri(null);
              setOcrResult(null);
              if (!activeCustomer) customer.reset();
              onSaved?.();
            },
          },
        ]
      );
    } catch (e) {
      console.warn('Foto yükleme hatası:', e);
      Alert.alert('Yükleme başarısız', e.message || 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.placeholderText}>
            Defter Fotoğrafı Önizlemesi{'\n'}(Henüz fotoğraf çekilmedi)
          </Text>
        )}
      </View>

      {ocrResult && (
        <ScrollView style={styles.ocrBox} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.ocrLabel}>
            Algılanan İsim: <Text style={styles.ocrName}>{ocrResult.guessedName || '— bulunamadı —'}</Text>
          </Text>
          <Text style={styles.ocrFullLabel}>Tam metin (doğruluk kontrolü):</Text>
          <Text style={styles.ocrFull}>{ocrResult.fullText || '—'}</Text>
        </ScrollView>
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.btnCapture]}
          onPress={handleCapture}
          disabled={busy}
        >
          <Text style={styles.btnText}>Çek</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnLibrary]}
          onPress={handlePickFromLibrary}
          disabled={busy}
        >
          <Text style={styles.btnText}>Galeri</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOcr, (!photoUri || busy) && styles.btnDisabled]}
          onPress={runOcrOnly}
          disabled={!photoUri || busy}
        >
          <Text style={styles.btnText}>İsim Oku</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnUpload, (!photoUri || busy) && styles.btnDisabled]}
          onPress={handleUploadAndSave}
          disabled={!photoUri || busy}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Arşive Yükle</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  preview: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D9DBE0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholderText: { color: '#5F6368', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  ocrBox: {
    maxHeight: 140,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D9DBE0',
    borderRadius: 10,
    backgroundColor: '#FFFBEA',
  },
  ocrLabel: { fontSize: 14, color: '#5F6368', marginBottom: 6 },
  ocrName: { fontWeight: '800', color: '#1F2328', fontSize: 16 },
  ocrFullLabel: { fontSize: 12, color: '#5F6368', marginTop: 4, marginBottom: 2 },
  ocrFull: { fontSize: 13, color: '#1F2328', fontFamily: 'Courier' },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCapture: { backgroundColor: '#1A73E8' },
  btnLibrary: { backgroundColor: '#5F6368' },
  btnOcr: { backgroundColor: '#F4B400' },
  btnUpload: { backgroundColor: '#2E7D32' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
