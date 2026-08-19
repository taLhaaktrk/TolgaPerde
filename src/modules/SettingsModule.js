import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useVersionCheck from '../hooks/useVersionCheck';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function SettingsModule() {
  const { user } = useAuth();
  const versionInfo = useVersionCheck();
  const insets = useSafeAreaInsets();
  const updateAvailable =
    versionInfo.latestVersion &&
    versionInfo.bundledVersion &&
    versionInfo.latestVersion !== versionInfo.bundledVersion;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Üst başlık paneli */}
        <View style={[styles.heroBlock, { paddingTop: (insets.top || 12) + 14 }]}>
          <Text style={styles.pageTitle}>Ayarlar</Text>
          <Text style={styles.pageSub}>Hesap · sürüm · platform</Text>
        </View>

        <View style={styles.content}>
          {/* Oturum */}
          <SectionHeader title="OTURUM" />
          <InfoRow label="Kullanıcı" value={user?.displayName || user?.username || '—'} />
          <InfoRow
            label="Rol"
            value={
              user?.role === 'admin' ? 'Yönetici'
              : user?.role === 'employee' ? 'Çalışan'
              : 'Kullanıcı'
            }
          />

          {/* Sürüm */}
          {versionInfo.bundledVersion && (
            <>
              <View style={styles.sectionSpacer} />
              <SectionHeader title="UYGULAMA SÜRÜMÜ" />
              <InfoRow label="Şu anki sürüm" value={versionInfo.bundledVersion} />
              {versionInfo.latestVersion && (
                <InfoRow
                  label="Sunucudaki son sürüm"
                  value={versionInfo.latestVersion}
                  valueColor={updateAvailable ? colors.gold : undefined}
                />
              )}
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
            </>
          )}

          {/* Platform */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="PLATFORM" />
          <InfoRow
            label="Çalışma ortamı"
            value={
              Platform.OS === 'web' ? 'Web / PWA'
              : Platform.OS === 'ios' ? 'iOS'
              : 'Android'
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 40 },

  heroBlock: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    backgroundColor: 'rgba(92, 13, 20, 0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },
  pageTitle: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  content: { paddingHorizontal: 22, paddingTop: 20 },

  sectionSpacer: { height: 32 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.15)',
  },
  sectionBar: {
    width: 3,
    height: 18,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'lowercase',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },

  reloadBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.45)',
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
    marginTop: 8,
    lineHeight: 16,
  },
});
