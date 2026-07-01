import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import SmartImage from '../ui/SmartImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppShell, MODULE_DESIGN } from '../../context/AppShellContext';
import { colors, gradients, radii, spacing, shadows } from '../../theme/colors';

/**
 * Generic media viewer.
 * - Tek görsel için: imageUrl
 * - Çoklu görsel + navigasyon için: images + initialIndex
 * - Eyebrow ve "Tasarım'a Git" butonu özelleştirilebilir.
 */
export default function CanvasViewerModal({
  visible,
  imageUrl,
  images,
  initialIndex = 0,
  customerName,
  eyebrow = 'KAYITLI ÇİZİM',
  showDesignButton = true,
  onClose,
}) {
  const { setActiveModule } = useAppShell();
  const imageList = Array.isArray(images) && images.length > 0
    ? images
    : (imageUrl ? [imageUrl] : []);

  const [index, setIndex] = useState(initialIndex);
  const [imgStatus, setImgStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setImgStatus('loading');
    }
  }, [visible, initialIndex]);

  // Görsel değişince yükleme durumunu sıfırla
  useEffect(() => {
    setImgStatus('loading');
  }, [index]);

  const currentUrl = imageList[index];
  if (!currentUrl) return null;

  const multi = imageList.length > 1;
  const canPrev = multi && index > 0;
  const canNext = multi && index < imageList.length - 1;

  const goToDesign = () => {
    onClose?.();
    setTimeout(() => setActiveModule(MODULE_DESIGN), 120);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>
              {eyebrow}{multi ? `  ·  ${index + 1} / ${imageList.length}` : ''}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {customerName || 'Müşteri'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Görsel + sol/sağ navigasyon */}
        <View style={styles.imageRow}>
          {multi && (
            <TouchableOpacity
              style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
              onPress={() => canPrev && setIndex((i) => i - 1)}
              disabled={!canPrev}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnTxt, !canPrev && styles.navBtnTxtDisabled]}>‹</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={1}
            style={styles.imageWrap}
            onPress={onClose}
          >
            <SmartImage
              source={{ uri: currentUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoadStart={() => setImgStatus('loading')}
              onLoad={() => setImgStatus('ok')}
              onError={(e) => {
                console.warn('Görsel yüklenemedi:', currentUrl, e?.nativeEvent || e);
                setImgStatus('error');
              }}
            />
            {imgStatus === 'loading' && (
              <View style={styles.imageOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.overlayTxt}>Görsel yükleniyor…</Text>
              </View>
            )}
            {imgStatus === 'error' && (
              <View style={styles.imageOverlay} pointerEvents="none">
                <Text style={styles.errorTitle}>Görsel Yüklenemedi</Text>
                <Text style={styles.overlayTxt}>İnternet bağlantınızı kontrol edip tekrar deneyin.</Text>
              </View>
            )}
          </TouchableOpacity>

          {multi && (
            <TouchableOpacity
              style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
              onPress={() => canNext && setIndex((i) => i + 1)}
              disabled={!canNext}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnTxt, !canNext && styles.navBtnTxtDisabled]}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {showDesignButton ? (
            <>
              <Text style={styles.footerHint}>
                Sadece görüntüleme. Değiştirmek için Tasarım'a git.
              </Text>
              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
                  <Text style={styles.btnGhostTxt}>Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={goToDesign}>
                  <LinearGradient
                    colors={gradients.goldButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnPrimary}
                  >
                    <Text style={styles.btnPrimaryTxt}>Tasarım'a Git</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
                <Text style={styles.btnGhostTxt}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.96)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerEyebrow: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#FFF', fontWeight: '700', fontSize: 18 },

  imageRow: {
    flex: 1,
    minHeight: 0, // önemli: child img'i container'ın içinde tut
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  navBtn: {
    width: 56,
    height: 80,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.25 },
  navBtnTxt: { color: '#FFF', fontSize: 36, fontWeight: '300', marginTop: -4 },
  navBtnTxtDisabled: { color: colors.textMuted },

  imageWrap: {
    flex: 1,
    minHeight: 0, // flex parent'ta img natural size'a göre taşmasını engeller
    borderRadius: radii.lg,
    backgroundColor: '#0A1628', // koyu navy zemin — beyaz boşluklar yerine temaya uyumlu
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.25)', // ince altın çerçeve
    overflow: 'hidden',
    ...shadows.lg,
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    gap: 12,
  },
  overlayTxt: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 },
  errorTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },

  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  footerHint: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  footerActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  btnGhost: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '700' },
  btnPrimary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  btnPrimaryTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 14 },
});
