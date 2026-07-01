import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Alert from '../../utils/alert';
import { colors, radii, spacing } from '../../theme/colors';

// Fotoğraf sıkıştırma parametreleri — upload süresini düşürmek için.
// 4032×3024 (~5MB) → 1600×1200 (~400KB) — 10x küçülme, kaliteden kayıp az.
const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_COMPRESS_QUALITY = 0.6;

// Picker'dan gelen tek bir asset'i upload için optimize et.
// Hata olursa orijinal asset'i sessizce kullan.
async function compressPhoto(asset) {
  try {
    const r = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: MAX_PHOTO_DIMENSION } }],
      { compress: PHOTO_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      uri: r.uri,
      mimeType: 'image/jpeg',
      remote: false,
    };
  } catch (e) {
    console.warn('[FOTO] Sıkıştırma başarısız, orijinali kullanılıyor:', e);
    return {
      uri: asset.uri,
      file: asset.file,
      mimeType: asset.mimeType,
      remote: false,
    };
  }
}

export default function MeasurementPhotosField({ photos, onChange, disabled }) {
  const addFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Kamera İzni Gerekli',
          'Fotoğraf çekmek için Ayarlar > Expo Go > Kamera bölümünden izin verin.',
          [{ text: 'Tamam' }],
          { tone: 'warning' }
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.length) {
        // Tüm assetleri paralel sıkıştır — upload süresi 10x azalır
        const compressed = await Promise.all(result.assets.map(compressPhoto));
        onChange([...photos, ...compressed]);
      }
    } catch (e) {
      console.warn('Kamera açılma hatası:', e);
      Alert.alert(
        'Kamera Açılamadı',
        e.message || 'Beklenmeyen bir hata oluştu.',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    }
  };

  const addFromGallery = async () => {
    try {
      // Modül yüklenmemiş kontrolü — Expo Go'da bazen native bridge gelmez
      if (!ImagePicker || typeof ImagePicker.launchImageLibraryAsync !== 'function') {
        console.error('[FOTO] ImagePicker yüklenmemiş!');
        Alert.alert(
          'Modül Yüklenmedi',
          'Fotoğraf modülü hazır değil. Uygulamayı tamamen kapatıp yeniden açın.',
          [{ text: 'Tamam' }],
          { tone: 'danger' }
        );
        return;
      }

      // iOS: galeri için izin ŞART. Web'de bu çağrı no-op gibi davranır.
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert(
            'Galeri İzni Gerekli',
            'Fotoğraf eklemek için Ayarlar > Expo Go > Fotoğraflar bölümünden izin verin.',
            [{ text: 'Tamam' }],
            { tone: 'warning' }
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 10,
      });
      if (!result.canceled && result.assets?.length) {
        // Tüm assetleri paralel sıkıştır — upload süresi 10x azalır
        const compressed = await Promise.all(result.assets.map(compressPhoto));
        onChange([...photos, ...compressed]);
      }
    } catch (e) {
      console.warn('Galeri açılma hatası:', e);
      Alert.alert(
        'Galeri Açılamadı',
        e.message || 'Beklenmeyen bir hata oluştu.',
        [{ text: 'Tamam' }],
        { tone: 'danger' }
      );
    }
  };

  const remove = (idx) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  // Not: Alert.alert ile seçim sunmuyoruz — async tick web'de user gesture'ı kırıyor.
  // İki ayrı buton (Galeri / Kamera) doğrudan kendi fonksiyonunu çağırır.

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>ÖLÇÜ / DEFTER FOTOĞRAFLARI</Text>
        <Text style={styles.count}>{photos.length} foto</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {photos.map((p, i) => (
          <View key={`${p.uri}-${i}`} style={styles.thumb}>
            <Image source={{ uri: p.uri }} style={styles.thumbImg} />
            {!disabled && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => remove(i)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            )}
            <View style={styles.thumbIndex}>
              <Text style={styles.thumbIndexTxt}>{i + 1}</Text>
            </View>
          </View>
        ))}

        {!disabled && (
          <>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addFromGallery}
              activeOpacity={0.7}
            >
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addLabel}>Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, styles.addBtnCamera]}
              onPress={addFromCamera}
              activeOpacity={0.7}
            >
              <Text style={[styles.addPlus, styles.addPlusCamera]}>+</Text>
              <Text style={styles.addLabel}>Kamera</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {photos.length === 0 && !disabled && (
        <Text style={styles.hint}>Galeri'den seç veya Kamera ile çek</Text>
      )}
    </View>
  );
}

const THUMB = 88;

const styles = StyleSheet.create({
  wrap: { marginVertical: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  count: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  row: { gap: spacing.sm, paddingRight: 8 },

  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTxt: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  thumbIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  thumbIndexTxt: { color: colors.gold, fontWeight: '800', fontSize: 10 },

  addBtn: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Kamera butonu — bordo accent ile galeriden ayır
  addBtnCamera: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  addPlus: { fontSize: 28, color: colors.gold, fontWeight: '900', lineHeight: 30 },
  addPlusCamera: { color: colors.primary },
  addLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  hint: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
});
