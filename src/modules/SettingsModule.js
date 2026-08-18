import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import ModuleHeader from '../components/shell/ModuleHeader';
import useVersionCheck from '../hooks/useVersionCheck';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/colors';

export default function SettingsModule() {
  const { user } = useAuth();
  const versionInfo = useVersionCheck();
  const updateAvailable =
    versionInfo.latestVersion &&
    versionInfo.bundledVersion &&
    versionInfo.latestVersion !== versionInfo.bundledVersion;

  return (
    <View style={styles.flex}>
      <ModuleHeader eyebrow="AYARLAR" title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Kullanıcı bilgisi */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OTURUM</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Kullanıcı</Text>
              <Text style={styles.rowValue}>{user?.displayName || user?.username || '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Rol</Text>
              <Text style={styles.rowValue}>
                {user?.role === 'admin' ? 'Yönetici' : user?.role === 'employee' ? 'Çalışan' : 'Kullanıcı'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sürüm & güncelleme */}
        {versionInfo.bundledVersion && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>UYGULAMA SÜRÜMÜ</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Şu anki sürüm</Text>
                <Text style={styles.rowValue}>{versionInfo.bundledVersion}</Text>
              </View>
              {versionInfo.latestVersion && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Sunucudaki son sürüm</Text>
                    <Text style={[styles.rowValue, updateAvailable && { color: colors.gold }]}>
                      {versionInfo.latestVersion}
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={versionInfo.reload}
                activeOpacity={0.7}
                style={styles.reloadBtn}
              >
                <Text style={styles.reloadTxt}>
                  {updateAvailable ? '↻ Yeni Sürüme Güncelle' : '↻ Sürümü Yenile (cache temizle)'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                {updateAvailable
                  ? 'Yeni bir sürüm yayınlanmış. Güncelle butonuna tıklayarak hemen alabilirsin.'
                  : 'Uygulaman güncel. Yine de yenilemek istersen bu butona tıkla — tarayıcı cache\'i temizlenip sıfırdan yüklenir.'}
              </Text>
            </View>
          </View>
        )}

        {/* Platform bilgisi */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLATFORM</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Çalışma ortamı</Text>
              <Text style={styles.rowValue}>
                {Platform.OS === 'web' ? 'Web / PWA' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  reloadBtn: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  reloadTxt: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    padding: spacing.lg,
    paddingTop: 0,
    lineHeight: 16,
  },
});
